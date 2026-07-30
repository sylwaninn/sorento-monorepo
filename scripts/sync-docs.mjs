#!/usr/bin/env node
/**
 * Regenerates README.md's generated blocks (badges, packages, commands, Edge Functions,
 * environment variables) from their single sources of truth: the manifests, the workspace
 * layout, the functions directory and .env.example. The README cannot silently drift.
 *
 * Descriptions live in the maps below on purpose: adding a script, package, function or env
 * var without describing it fails `--check`, which turns "the docs need updating" into a hard
 * signal (in CI, in `pnpm verify` and in the Claude Code Stop hook) instead of a hope.
 *
 * `--check` fails instead of writing, which is what CI runs.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const readmePath = join(root, "README.md");
const isCheck = process.argv.includes("--check");
const problems = [];

// The README lands with the CI branch at the top of the stack; on the branches
// underneath it there is nothing to sync yet.
if (!existsSync(readmePath)) {
  console.log("sync-docs: no README.md in this tree, nothing to sync");
  process.exit(0);
}

const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

const rootPkg = readJson("package.json");
const webPkg = readJson("apps/web/package.json");
const corePkg = readJson("packages/core/package.json");
const domainPkg = readJson("packages/domain/package.json");
const clientPkg = readJson("packages/supabase-client/package.json");
const e2ePkg = readJson("e2e/package.json");

// ---------------------------------------------------------------------------
// Description maps: the one part of the generated blocks that is authored here.
// A key with no entry fails the run; a stale entry fails it too.
// ---------------------------------------------------------------------------

const PACKAGE_DESCRIPTIONS = {
  "@sorento/web":
    "React SPA, the assembly layer. Composes the packages into screens; contains no business rule.",
  "@sorento/core":
    "Pure business rules (journey engine, permissions, deadlines). No React, no I/O, injected clock.",
  "@sorento/domain":
    "Zod schemas and the types inferred from them: the single source of truth for domain shapes.",
  "@sorento/supabase-client":
    "Repositories and row-to-domain mappers. The only package allowed to import `@supabase/supabase-js`.",
  "@sorento/config":
    "Shared tooling presets: ESLint (including import boundaries), TypeScript, Prettier, Vitest coverage.",
  "@sorento/e2e":
    "Playwright end-to-end journeys against the real local stack (built app, real RLS, real Edge Functions).",
};

const SCRIPT_DESCRIPTIONS = {
  dev: "Start every dev server (Vite for `apps/web`) through Turborepo.",
  build: "Build all packages and the web app.",
  lint: "ESLint across the workspace, import boundaries included.",
  typecheck: "TypeScript checks across the workspace.",
  test: "Unit tests (Vitest) across the workspace.",
  "test:integration":
    "Integration tests (RLS, hardening, Edge Functions) against the local Supabase stack.",
  "test:coverage": "Unit tests with per-package coverage thresholds.",
  "test:mutation": "Stryker mutation testing on `core` and `domain`.",
  "test:functions": "Deno tests for the Edge Functions' shared modules.",
  "check:functions": "Verify the Deno import map, then lint and typecheck every Edge Function.",
  "check:tests": "Structural test audit: every rule module has a test, every test has a subject.",
  "test:e2e": "Playwright end-to-end journeys (needs the local stack and a production build).",
  "coverage:diff":
    "Coverage of the lines the current branch changed, from the existing lcov reports.",
  "coverage:ratchet": "Raise each package's coverage thresholds to what it actually achieves.",
  "coverage:ratchet:check": "Fail when coverage thresholds have too much slack under them.",
  "check:docs": "Fail if this README's generated blocks are stale (CI and hooks run this).",
  "sync:functions-imports": "Regenerate the Deno import map for the Edge Functions.",
  "sync:docs": "Regenerate this README's generated blocks.",
  format: "Prettier, write mode.",
  "format:check": "Prettier, check mode.",
  verify: "The full local quality gate: the same bar CI enforces.",
  prepare: "Husky bootstrap; runs automatically on install.",
};

const FUNCTION_DESCRIPTIONS = {
  "accept-invitation": "Accepts a dossier invitation and creates the membership.",
  "consent-trusted-contact":
    "Records the trusted contact's consent and issues their long-lived activation link.",
  "daily-reminders": "Cron: computes and queues the daily reminder notifications.",
  "designate-trusted-contact": "Designates a trusted contact and sends the consent link.",
  "dev-signup":
    "Development only (`env.isDevelopment`): account creation without a confirmation email. Answers 404 anywhere else.",
  "invite-member": "Sends a dossier invitation email.",
  "oppose-dossier-activation":
    "Registers a member's objection during the 48 h activation grace period.",
  "process-dossier-activations":
    "Cron: activates dossiers whose 48 h grace period expired without objection.",
  "request-dossier-activation":
    "Lets the trusted contact request activation: starts the 48 h grace period and notifies every member.",
  "resolve-invitation":
    "Public: resolves an invitation token to who invites to which dossier, and nothing more.",
  "resolve-trusted-contact-activation":
    "Public: resolves an activation token so the trusted contact sees what is about to happen.",
  "send-pending-emails": "Cron: delivers the queued notification emails.",
  "weekly-digest":
    "Cron: queues the opt-in weekly progress summary (what advanced, never what is late).",
};

const ENV_DESCRIPTIONS = {
  VITE_SUPABASE_URL: { scope: "Client", text: "Supabase project URL, exposed to the browser." },
  VITE_SUPABASE_ANON_KEY: {
    scope: "Client",
    text: "Supabase anonymous key. Safe client-side: RLS does the guarding.",
  },
  VITE_SITE_URL: {
    scope: "Client",
    text: "Public origin of the deployed site. Unset, the build ships no sitemap.xml and no canonical link rather than an invented domain.",
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    scope: "Server",
    text: "Bypasses RLS. Edge Functions and server-side scripts only: never client-side, never committed.",
  },
  SUPABASE_DB_URL: {
    scope: "Server",
    text: "Direct Postgres connection, used by the integration tests.",
  },
  RESEND_API_KEY: { scope: "Server", text: "Transactional email provider key." },
  RESEND_FROM_EMAIL: { scope: "Server", text: "Sender address for transactional emails." },
  SITE_URL: {
    scope: "Server",
    text: "Base URL the Edge Functions use to build links (invitations, activation).",
  },
  CRON_SECRET: {
    scope: "Server",
    text: "Shared secret protecting the cron-invoked functions; mirrored in Vault (`cron_secret`).",
  },
  SUPPORT_EMAIL: {
    scope: "Server",
    text: "Recipient of activation objections. Unset, the function logs a warning instead of pretending it warned someone.",
  },
  APP_ENV: {
    scope: "Server",
    text: "`development` unlocks the dev-only endpoints. Absent in staging and production: door closed.",
  },
  TURNSTILE_SITE_KEY: { scope: "Client", text: "Captcha (hook planned, not enabled in V1)." },
  TURNSTILE_SECRET_KEY: { scope: "Server", text: "Captcha (hook planned, not enabled in V1)." },
};

// ---------------------------------------------------------------------------
// Facts read from the tree
// ---------------------------------------------------------------------------

const dep = (pkg, name) => {
  const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  if (!range) {
    problems.push(
      `"${name}" not found in ${pkg.name}'s manifest. Update the badge list in scripts/sync-docs.mjs`,
    );
    return "?";
  }
  return range.replace(/^[~^]/, "");
};

/**
 * Read from wherever CI actually pins it. It moved out of the workflow and into the composite
 * setup action once six jobs stopped repeating the same four steps, and this rule silently
 * reported "?" as the version until the pre-commit hook caught it. Both files are searched so
 * the next move does not need a third edit.
 */
const DENO_VERSION_SOURCES = [".github/actions/setup/action.yml", ".github/workflows/ci.yml"];

const denoVersion = () => {
  for (const source of DENO_VERSION_SOURCES) {
    const match = readFileSync(join(root, source), "utf8").match(/deno-version:\s*v?(\S+)/);
    if (match) return match[1];
  }
  problems.push(`deno-version not found in ${DENO_VERSION_SOURCES.join(" or ")}`);
  return "?";
};

const workspaceDirs = () => {
  const globs = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8")
    .split("\n")
    .map((line) => line.match(/^\s*-\s*"(.+)"\s*$/))
    .filter(Boolean)
    .map((match) => match[1]);
  return globs
    .flatMap((glob) =>
      glob.endsWith("/*")
        ? readdirSync(join(root, glob.slice(0, -2)), { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => `${glob.slice(0, -2)}/${entry.name}`)
        : [glob],
    )
    .sort();
};

const functionSlugs = () =>
  readdirSync(join(root, "supabase/functions"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();

const envVarNames = () =>
  readFileSync(join(root, ".env.example"), "utf8")
    .split("\n")
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/))
    .filter(Boolean)
    .map((match) => match[1]);

const requireDescriptions = (kind, keys, map) => {
  for (const key of keys.filter((k) => !(k in map))) {
    problems.push(`missing ${kind} description for "${key}": add it to scripts/sync-docs.mjs`);
  }
  for (const key of Object.keys(map).filter((k) => !keys.includes(k))) {
    problems.push(`stale ${kind} description for "${key}": remove it from scripts/sync-docs.mjs`);
  }
};

// ---------------------------------------------------------------------------
// Block rendering
// ---------------------------------------------------------------------------

const badge = (label, value, color, logo) => {
  const escape = (text) => encodeURIComponent(text.replace(/-/g, "--").replace(/_/g, "__"));
  const logoQuery = logo ? `&logo=${logo}&logoColor=white` : "";
  return `![${label} ${value}](https://img.shields.io/badge/${escape(label)}-${escape(value)}-${color}?style=flat-square${logoQuery})`;
};

// The CI badge needs the GitHub owner/repo, which only the remote knows. No origin yet (or a
// non-GitHub one) simply means no badge; it appears on the next sync:docs after the push.
const ciBadge = () => {
  let url = "";
  try {
    url = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
  const match = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) return null;
  const workflow = `https://github.com/${match[1]}/${match[2]}/actions/workflows/ci.yml`;
  return `[![CI](${workflow}/badge.svg)](${workflow})`;
};

const badgesBlock = () =>
  [
    ciBadge(),
    badge("Node.js", rootPkg.engines.node.replace(">=", "≥"), "5FA04E", "nodedotjs"),
    badge("pnpm", rootPkg.packageManager.split("@")[1], "F69220", "pnpm"),
    badge("TypeScript", dep(rootPkg, "typescript"), "3178C6", "typescript"),
    badge("React", dep(webPkg, "react"), "087EA4", "react"),
    badge("Vite", dep(webPkg, "vite"), "646CFF", "vite"),
    badge("Tailwind CSS", dep(webPkg, "tailwindcss"), "06B6D4", "tailwindcss"),
    badge("shadcn/ui", dep(webPkg, "radix-ui"), "000000", "shadcnui"),
    badge("supabase-js", dep(clientPkg, "@supabase/supabase-js"), "3FCF8E", "supabase"),
    badge("Zod", dep(domainPkg, "zod"), "3E67B1", "zod"),
    badge("Deno", denoVersion(), "70FFAF", "deno"),
    badge("Turborepo", dep(rootPkg, "turbo"), "EF4444", "turborepo"),
    badge("Vitest", dep(webPkg, "vitest"), "6E9F18", "vitest"),
    badge("Playwright", dep(e2ePkg, "@playwright/test"), "2EAD33"),
    badge("Stryker", dep(corePkg, "@stryker-mutator/core"), "E74C3C"),
  ]
    .filter(Boolean)
    .join("\n");

const packagesBlock = () => {
  const rows = workspaceDirs().map((dir) => {
    const pkg = readJson(join(dir, "package.json"));
    return `| \`${pkg.name}\` | \`${dir}\` | ${PACKAGE_DESCRIPTIONS[pkg.name] ?? ""} |`;
  });
  requireDescriptions(
    "package",
    workspaceDirs().map((dir) => readJson(join(dir, "package.json")).name),
    PACKAGE_DESCRIPTIONS,
  );
  return ["| Package | Path | Role |", "| --- | --- | --- |", ...rows].join("\n");
};

const commandsBlock = () => {
  const names = Object.keys(rootPkg.scripts);
  requireDescriptions("script", names, SCRIPT_DESCRIPTIONS);
  const rows = names.map((name) => `| \`pnpm ${name}\` | ${SCRIPT_DESCRIPTIONS[name] ?? ""} |`);
  return ["| Command | What it does |", "| --- | --- |", ...rows].join("\n");
};

const functionsBlock = () => {
  const slugs = functionSlugs();
  requireDescriptions("Edge Function", slugs, FUNCTION_DESCRIPTIONS);
  const rows = slugs.map((slug) => `| \`${slug}\` | ${FUNCTION_DESCRIPTIONS[slug] ?? ""} |`);
  return ["| Function | Purpose |", "| --- | --- |", ...rows].join("\n");
};

const envBlock = () => {
  const names = envVarNames();
  requireDescriptions("env var", names, ENV_DESCRIPTIONS);
  const rows = names.map((name) => {
    const entry = ENV_DESCRIPTIONS[name] ?? { scope: "", text: "" };
    return `| \`${name}\` | ${entry.scope} | ${entry.text} |`;
  });
  return ["| Variable | Scope | Description |", "| --- | --- | --- |", ...rows].join("\n");
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const replaceBlock = (content, name, body) => {
  const start = `<!-- sync-docs:${name} -->`;
  const end = `<!-- /sync-docs:${name} -->`;
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    problems.push(`README.md is missing the "${name}" markers (${start} … ${end})`);
    return content;
  }
  return `${content.slice(0, startIndex + start.length)}\n\n${body}\n\n${content.slice(endIndex)}`;
};

// The blocks must survive `pnpm format:check`, so the exact byte layout is delegated to the
// same Prettier the repo runs instead of being imitated here.
const prettify = (markdown) =>
  execFileSync("pnpm", ["exec", "prettier", "--stdin-filepath", "README.md"], {
    cwd: root,
    input: markdown,
    encoding: "utf8",
  });

const current = readFileSync(readmePath, "utf8");
let next = current;
for (const [name, body] of [
  ["badges", badgesBlock()],
  ["packages", packagesBlock()],
  ["commands", commandsBlock()],
  ["functions", functionsBlock()],
  ["env", envBlock()],
]) {
  next = replaceBlock(next, name, body);
}

if (problems.length > 0) {
  console.error(problems.map((problem) => `  - ${problem}`).join("\n"));
  process.exit(1);
}

try {
  next = prettify(next);
} catch {
  console.error("could not run `pnpm exec prettier`. Is the workspace installed?");
  process.exit(1);
}

if (next === current) {
  process.exit(0);
}

if (isCheck) {
  console.error("README.md's generated blocks are out of date. Run: pnpm sync:docs");
  process.exit(1);
}

writeFileSync(readmePath, next);
console.log("README.md updated");
