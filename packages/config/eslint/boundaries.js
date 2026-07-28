import { fileURLToPath } from "node:url";
import boundaries from "eslint-plugin-boundaries";

// packages/config/eslint/boundaries.js -> monorepo root. Resolved from this file rather than
// cwd because turbo runs eslint from inside each package, where cwd is the package itself.
const MONOREPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

const SUPABASE_JS = {
  name: "@supabase/supabase-js",
  message:
    "Import through @sorento/supabase-client only (CLAUDE.md: it is the one package allowed to import @supabase/supabase-js).",
};

const noReact = (from) => [
  { name: "react", message: `${from} is pure code: no React dependency (CLAUDE.md).` },
  { name: "react-dom", message: `${from} is pure code: no React dependency (CLAUDE.md).` },
];

// Relative specifiers escape the alias contract and make modules unmovable. Everything is
// addressed absolutely: #domain/*, #core/*, #client/* inside the packages, @/* in apps/web.
const RELATIVE_IMPORTS = {
  group: ["./*", "./**", "../*", "../**"],
  message:
    "Absolute imports only: #domain/*, #core/*, #client/* inside the packages, @/* in apps/web.",
};

const APP_IMPORTS = {
  group: ["@sorento/web", "**/apps/*", "**/apps/**"],
  message: "No package depends on an app (CLAUDE.md: apps/web is the only assembly layer).",
};

// Flat config resolves a rule to its LAST matching entry, so each scope repeats the shared
// patterns instead of relying on merge.
const restrict = (files, paths) => ({
  files,
  rules: {
    "no-restricted-imports": ["error", { paths, patterns: [RELATIVE_IMPORTS, APP_IMPORTS] }],
  },
});

/**
 * Enforces the monorepo dependency rules from CLAUDE.md:
 * domain -> (nothing) ; core -> domain ; supabase-client -> domain ;
 * apps/web -> everything. No package may import from apps/*.
 *
 * Two layers, because they catch different things. eslint-plugin-boundaries reasons about
 * resolved file paths, so it covers a relative reach across directories; the
 * no-restricted-imports layer reasons about specifiers, which is the only thing that catches
 * a bare workspace specifier like "@sorento/core" — the plugin resolves those into
 * node_modules and classifies them as external, so it never sees them.
 */
export const boundariesConfig = [
  {
    plugins: { boundaries },
    settings: {
      "boundaries/root-path": MONOREPO_ROOT,
      "boundaries/elements": [
        { type: "domain", pattern: "packages/domain/src/**" },
        { type: "core", pattern: "packages/core/src/**" },
        { type: "supabase-client", pattern: "packages/supabase-client/src/**" },
        { type: "config", pattern: "packages/config/**" },
        { type: "app", pattern: "apps/*/src/**" },
        { type: "e2e", pattern: "e2e/**" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "domain", allow: [] },
            { from: "core", allow: ["domain"] },
            { from: "supabase-client", allow: ["domain"] },
            { from: "app", allow: ["domain", "core", "supabase-client", "config"] },
            // The journeys are a black box around the built app: they speak HTTP to the running
            // stack and import none of its packages, so a bug shared with the app cannot hide
            // itself, and the suite needs no workspace build before it can run.
            { from: "e2e", allow: [] },
          ],
        },
      ],
    },
  },

  restrict(["**/*.{ts,tsx}"], [SUPABASE_JS]),

  restrict(
    ["**/packages/domain/src/**/*.ts"],
    [
      SUPABASE_JS,
      ...noReact("packages/domain"),
      { name: "@sorento/core", message: "packages/domain depends on nothing (CLAUDE.md)." },
      {
        name: "@sorento/supabase-client",
        message: "packages/domain depends on nothing (CLAUDE.md).",
      },
    ],
  ),

  restrict(
    ["**/packages/core/src/**/*.ts"],
    [
      SUPABASE_JS,
      ...noReact("packages/core"),
      {
        name: "@sorento/supabase-client",
        message: "packages/core depends on @sorento/domain only (CLAUDE.md).",
      },
    ],
  ),

  restrict(
    ["**/packages/supabase-client/src/**/*.ts"],
    [
      ...noReact("packages/supabase-client"),
      {
        name: "@sorento/core",
        message: "packages/supabase-client depends on @sorento/domain only (CLAUDE.md).",
      },
    ],
  ),
];
