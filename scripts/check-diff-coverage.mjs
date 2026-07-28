#!/usr/bin/env node
/**
 * Coverage of the lines this branch changed, rather than of the repository as a whole.
 *
 * A global threshold is a ratio, and a ratio is dominated by code written months ago. On a
 * repository with a large untested surface, a hundred new untested lines move it by a fraction
 * of a point — so the gate that is supposed to mean "changes arrive with tests" stays green
 * through exactly the change it exists to catch. This asks the narrower question the global
 * number cannot: of the lines you touched, how many does a test actually execute?
 *
 * Reads the lcov files `pnpm test:coverage` already produces, so it costs nothing extra.
 *
 *   node scripts/check-diff-coverage.mjs [--base <ref>] [--min <percent>]
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LCOV_FILES = [
  "packages/core/coverage/lcov.info",
  "packages/domain/coverage/lcov.info",
  "packages/supabase-client/coverage/lcov.info",
  "apps/web/coverage/lcov.info",
  // Produced by `pnpm test:functions`, which runs under Deno rather than vitest. Without it the
  // shared code every Edge Function executes before anything else would be the one layer running
  // as service_role and facing no coverage gate at all. It is written beside supabase/functions
  // rather than inside it because two scripts read that directory's entries as the list of
  // deployed endpoints, and a coverage folder there reads as a fourteenth function.
  "supabase/coverage/lcov.info",
];

/**
 * Files whose changed lines are not measured by any lcov, on purpose. Each is covered by a
 * suite that reports no coverage — the integration suites run against a real database, the Deno
 * suites run outside vitest — or holds no behaviour to cover.
 */
const NOT_MEASURED = [
  // Everything under supabase/ except the shared Edge Function code, which now reports lcov of
  // its own. The handlers themselves stay out: they are covered by the HTTP integration suite,
  // which runs them in the Edge runtime and reports no coverage from there.
  /^supabase\/(?!functions\/_shared\/)/,
  /^e2e\//,
  /^scripts\//,
  /^packages\/config\//,
  /\/integration-tests\//,
  /\.test\.tsx?$/,
  /\.d\.ts$/,
  /database\.types\.ts$/,
  /\/content\.ts$/,
  /\/test-fixtures\.ts$/,
  /^apps\/web\/src\/(main|routes)\.tsx$/,
  /^apps\/web\/src\/test\//,
  /\/index\.ts$/,
];

const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
};

const MINIMUM = Number(argument("--min", "80"));

// stderr is swallowed: resolving the base tries several refs and the ones that miss are not
// failures, they are the search.
const git = (...args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    .trim();

/**
 * On a pull request the base branch is what the change is measured against. Locally, the merge
 * base with main plays the same role: comparing against the tip of main would also flag lines
 * someone else landed in the meantime.
 */
const resolveBase = () => {
  const explicit = argument("--base", null);
  if (explicit) return explicit;

  const prBase = process.env["GITHUB_BASE_REF"];
  const candidates = prBase ? [`origin/${prBase}`, prBase] : ["origin/main", "main"];

  for (const candidate of candidates) {
    try {
      return git("merge-base", candidate, "HEAD");
    } catch {
      continue;
    }
  }
  return null;
};

const changedLinesByFile = (base) => {
  let diff;
  try {
    diff = git("diff", "--unified=0", "--diff-filter=ACMR", `${base}...HEAD`, "--", "*.ts", "*.tsx");
  } catch {
    // A repository with no commit yet, or a base that no longer resolves. Nothing to measure,
    // and refusing to run would block the very first commit.
    return null;
  }
  const byFile = new Map();
  let current = null;

  for (const line of diff.split("\n")) {
    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line);
    if (fileMatch) {
      current = fileMatch[1];
      if (!byFile.has(current)) byFile.set(current, new Set());
      continue;
    }

    const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunkMatch && current) {
      const start = Number(hunkMatch[1]);
      const count = hunkMatch[2] === undefined ? 1 : Number(hunkMatch[2]);
      const lines = byFile.get(current);
      for (let offset = 0; offset < count; offset += 1) lines.add(start + offset);
    }
  }

  return byFile;
};

/** lcov paths are relative to the package that produced the report, so they are re-rooted. */
const readCoverage = () => {
  const executionsByFile = new Map();

  for (const lcovPath of LCOV_FILES) {
    const absolute = join(ROOT, lcovPath);
    if (!existsSync(absolute)) continue;
    const packageRoot = join(ROOT, dirname(dirname(lcovPath)));

    let current = null;
    for (const line of readFileSync(absolute, "utf8").split("\n")) {
      if (line.startsWith("SF:")) {
        const file = line.slice(3).trim();
        current = relative(ROOT, resolve(packageRoot, file));
        if (!executionsByFile.has(current)) executionsByFile.set(current, new Map());
        continue;
      }
      if (line.startsWith("DA:") && current) {
        const [lineNumber, hits] = line.slice(3).split(",").map(Number);
        const existing = executionsByFile.get(current).get(lineNumber) ?? 0;
        executionsByFile.get(current).set(lineNumber, Math.max(existing, hits));
      }
    }
  }

  return executionsByFile;
};

const base = resolveBase();
if (base === null) {
  console.log("check-diff-coverage: no base branch to compare against, nothing to check");
  process.exit(0);
}

const changed = changedLinesByFile(base);
if (changed === null) {
  console.log("check-diff-coverage: no comparable history, nothing to check");
  process.exit(0);
}

const coverage = readCoverage();

if (coverage.size === 0) {
  console.error("check-diff-coverage: no lcov report found. Run `pnpm test:coverage` first.");
  process.exit(1);
}

let measured = 0;
let covered = 0;
const gaps = [];
const unmeasured = [];

for (const [file, lines] of changed) {
  if (NOT_MEASURED.some((pattern) => pattern.test(file))) continue;

  const executions = coverage.get(file);
  if (executions === undefined) {
    unmeasured.push(file);
    continue;
  }

  const missing = [];
  for (const lineNumber of lines) {
    // A line absent from the report is not executable — a blank line, a type, a closing brace.
    const hits = executions.get(lineNumber);
    if (hits === undefined) continue;
    measured += 1;
    if (hits > 0) covered += 1;
    else missing.push(lineNumber);
  }

  if (missing.length > 0) gaps.push({ file, missing: missing.sort((a, b) => a - b) });
}

const percentage = measured === 0 ? 100 : Math.round((covered / measured) * 1000) / 10;

if (unmeasured.length > 0) {
  console.log(`check-diff-coverage: ${unmeasured.length} changed file(s) outside any report`);
  for (const file of unmeasured) console.log(`  ${file}`);
  console.log("");
}

if (percentage >= MINIMUM) {
  console.log(`check-diff-coverage: ${percentage}% of ${measured} changed line(s) covered`);
  process.exit(0);
}

console.error(
  `check-diff-coverage: ${percentage}% of ${measured} changed line(s) covered, below ${MINIMUM}%\n`,
);
for (const { file, missing } of gaps) {
  console.error(`  ${file}`);
  console.error(`    uncovered: ${missing.join(", ")}`);
}
console.error(
  "\nThese are lines this branch added or changed that no test executes. Cover them, or say" +
    " in the pull request why they cannot be.",
);
process.exit(1);
