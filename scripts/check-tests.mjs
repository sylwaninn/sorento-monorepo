#!/usr/bin/env node
/**
 * Structural test-suite audit. Runs without a database, without a browser and without
 * executing a single test, so it can sit at the front of `pnpm verify` and in the pre-commit
 * hook where a full suite would be too slow.
 *
 * It answers the two questions coverage cannot:
 *   - does every module that must be tested actually have a test file? (a new rule shipped
 *     without one raises coverage nowhere, so no threshold catches it)
 *   - does every test still describe something that exists? (a test file left behind after
 *     its subject was deleted keeps passing forever and is read as evidence)
 *
 * Every rule is deliberately structural: it compares the file tree against itself. Anything
 * that needs a running system belongs in the integration or E2E suites instead.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  ".turbo",
  ".git",
  "coverage",
  "reports",
  ".stryker-tmp",
  "test-results",
  "playwright-report",
]);

/**
 * Modules whose behaviour must be asserted by a sibling `<name>.test.ts`. These are the layers
 * where an untested change is a silent change: business rules, the validation boundary, the
 * row-to-domain translation, and the shared code every Edge Function runs before anything else.
 */
const REQUIRE_SIBLING_TEST = [
  { dir: "packages/core/src", exclude: ["index.ts", "test-fixtures.ts"] },
  { dir: "packages/domain/src", exclude: ["index.ts", "ports.ts", "test-fixtures.ts"] },
  { dir: "packages/supabase-client/src/mappers", exclude: ["index.ts"] },
  // supabase.ts is client construction with no branch of its own; it is exercised end to end
  // by the Edge Function HTTP tests instead.
  { dir: "supabase/functions/_shared", exclude: ["supabase.ts"] },
];

/**
 * Test files that cover a theme rather than one module, so they have no sibling source. Each
 * entry is a decision: the list stays short precisely because adding to it is visible in review.
 */
const SUITE_TESTS = new Set([
  "packages/core/src/engine-ordering.test.ts",
  "packages/core/src/diagnostic-questions.test.ts",
  "packages/supabase-client/src/integration-tests/rls.integration.test.ts",
  "packages/supabase-client/src/integration-tests/hardening.integration.test.ts",
  "packages/supabase-client/src/integration-tests/policy-snapshot.integration.test.ts",
  "packages/supabase-client/src/integration-tests/sql-mirrors.integration.test.ts",
  "packages/supabase-client/src/integration-tests/edge-functions.integration.test.ts",
  "packages/supabase-client/src/integration-tests/jobs.integration.test.ts",
]);

/** Where the suites live. Anything matching TEST_FILE outside these roots is unowned. */
const TEST_ROOTS = ["packages", "apps", "supabase/functions", "e2e"];

/**
 * The Edge Function suite's own table, and the only place naming a function counts. Matching
 * anywhere in the file would let a mention in a comment stand in for a case.
 */
const EDGE_FUNCTION_TABLE =
  "packages/supabase-client/src/integration-tests/edge-functions.integration.test.ts";

/** Where the journeys record which dictionary each French string was copied from. */
const E2E_COPY = "e2e/support/copy.ts";

/** Content dictionaries live under this root; the paths in E2E_COPY are relative to it. */
const CONTENT_ROOT = "apps/web/src";

const TEST_FILE = /\.(test|spec)\.(ts|tsx)$/;
const E2E_FILE = /\.e2e\.ts$/;

const failures = [];
const fail = (rule, file, message) => failures.push({ rule, file, message });

const walk = (dir) => {
  const absolute = join(ROOT, dir);
  let entries;
  try {
    entries = readdirSync(absolute, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    if (entry.name.startsWith(".") && entry.name !== ".") return [];
    const child = join(dir, entry.name);
    if (entry.isDirectory()) return IGNORED_DIRS.has(entry.name) ? [] : walk(child);
    return [child];
  });
};

const exists = (relativePath) => {
  try {
    statSync(join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
};

const allFiles = TEST_ROOTS.flatMap(walk);
const testFiles = allFiles.filter((file) => TEST_FILE.test(file) || E2E_FILE.test(file));
const read = (file) => readFileSync(join(ROOT, file), "utf8");

// ---------------------------------------------------------------------------
// R1 — every test file still has a subject
// ---------------------------------------------------------------------------

const subjectCandidates = (testFile) => {
  const stem = basename(testFile).replace(TEST_FILE, "").replace(E2E_FILE, "");
  const dir = dirname(testFile);
  return [".ts", ".tsx"].map((ext) => join(dir, `${stem}${ext}`));
};

for (const testFile of testFiles) {
  if (SUITE_TESTS.has(testFile)) continue;
  if (testFile.startsWith("e2e/")) continue; // journeys, not modules
  if (subjectCandidates(testFile).some(exists)) continue;
  fail(
    "orphan-test",
    testFile,
    "no sibling module with this name. Either the subject was deleted and this file should go, or it is a themed suite and belongs in SUITE_TESTS in scripts/check-tests.mjs.",
  );
}

// ---------------------------------------------------------------------------
// R2 — every module that must be tested has a test
// ---------------------------------------------------------------------------

for (const { dir, exclude } of REQUIRE_SIBLING_TEST) {
  const excluded = new Set(exclude);
  for (const file of walk(dir)) {
    const name = basename(file);
    if (extname(file) !== ".ts" || TEST_FILE.test(file) || excluded.has(name)) continue;
    if (name === "test-fixtures.ts" || name.endsWith(".d.ts") || name.endsWith(".types.ts")) {
      continue;
    }
    const expected = file.replace(/\.ts$/, ".test.ts");
    if (!exists(expected)) {
      fail("untested-module", file, `expected ${expected}. Every rule arrives with its tests.`);
    }
  }
}

// ---------------------------------------------------------------------------
// R3 — every Edge Function is named by a test
// ---------------------------------------------------------------------------

const functionNames = readdirSync(join(ROOT, "supabase/functions"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "_shared")
  .map((entry) => entry.name);

/**
 * Read from the suite's table rather than from the whole file: a function named only in a
 * comment, or in the prose explaining why some other function behaves as it does, would
 * otherwise count as covered and the rule would pass for a function no case ever calls.
 */
const tabledFunctions = new Map(
  exists(EDGE_FUNCTION_TABLE)
    ? Array.from(
        read(EDGE_FUNCTION_TABLE).matchAll(/\bname:\s*"([^"]+)",\s*guard:\s*"([^"]+)"/g),
        (match) => [match[1], match[2]],
      )
    : [],
);

for (const name of functionNames) {
  if (!tabledFunctions.has(name)) {
    fail(
      "untested-edge-function",
      `supabase/functions/${name}/index.ts`,
      `runs with service_role and the table in ${EDGE_FUNCTION_TABLE} does not name it with a guard. Add a case.`,
    );
  }
}

for (const name of tabledFunctions.keys()) {
  if (!exists(`supabase/functions/${name}`)) {
    fail(
      "phantom-edge-function",
      EDGE_FUNCTION_TABLE,
      `the table names "${name}", which no longer exists under supabase/functions. A case against a deleted endpoint asserts nothing.`,
    );
  }
}

/**
 * The guard each function is tested under is stated twice: as a tag in the suite's table, and as
 * `verify_jwt` in supabase/config.toml, which is what the gateway actually enforces. Only one of
 * the two is real, and they fail in opposite directions when they disagree. A function tested as
 * jwt-guarded but deployed with `verify_jwt = false` is an endpoint whose guard nobody enforces;
 * one tested as token-guarded but deployed with `verify_jwt = true` is unreachable by the
 * anonymous caller its whole design assumes, and its refusal tests keep passing because the
 * gateway is the one refusing.
 *
 * A function missing from config.toml entirely is the same bug with a default in front of it.
 */
const CONFIG = "supabase/config.toml";

const declaredVerifyJwt = new Map(
  exists(CONFIG)
    ? Array.from(
        read(CONFIG).matchAll(/^\[functions\.([^\]]+)\]$([\s\S]*?)(?=^\[|\Z)/gm),
        (match) => [match[1], /^verify_jwt\s*=\s*(true|false)/m.exec(match[2])?.[1]],
      )
    : [],
);

for (const [name, guard] of tabledFunctions) {
  const declared = declaredVerifyJwt.get(name);
  if (declared === undefined) {
    fail(
      "undeclared-edge-function",
      CONFIG,
      `has no [functions.${name}] block, so the gateway falls back to its default rather than to a decision. Declare it.`,
    );
    continue;
  }

  const expected = guard === "jwt" ? "true" : "false";
  if (declared !== expected) {
    fail(
      "guard-disagreement",
      CONFIG,
      `[functions.${name}] sets verify_jwt = ${declared}, and the suite tests it as "${guard}", which implies ${expected}. One of the two is wrong about who may reach this endpoint.`,
    );
  }
}

// ---------------------------------------------------------------------------
// R4 — no test silently survives a deleted key
// ---------------------------------------------------------------------------

/**
 * `content.questions["mode"]?.title ?? ""` keeps passing after `mode` is removed from the copy
 * dictionary: the assertion just compares against the empty string. Same for `!` and for a
 * `?? []` around a list. Tests must read through a helper that throws on a missing key, so a
 * removed key fails loudly at the first test that wanted it.
 */
const MASKING_PATTERNS = [
  { pattern: /\?\?\s*""/g, hint: 'use must(...) instead of ?? ""' },
  { pattern: /\?\?\s*\[\]/g, hint: "use must(...) instead of ?? []" },
  { pattern: /\?\?\s*\{\}/g, hint: "use must(...) instead of ?? {}" },
];

const FOCUS_PATTERNS = [
  {
    pattern: /\b(?:describe|it|test)\.only\s*\(/g,
    hint: ".only silently skips the rest of the file",
  },
  {
    pattern: /\b(?:describe|it|test)\.skip\s*\(/g,
    hint: "a skipped test is a test that does not exist",
  },
  { pattern: /\bx(?:describe|it)\s*\(/g, hint: "a skipped test is a test that does not exist" },
];

for (const testFile of testFiles) {
  const source = read(testFile);
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) return;
    for (const { pattern, hint } of [...MASKING_PATTERNS, ...FOCUS_PATTERNS]) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        const rule = MASKING_PATTERNS.some((entry) => entry.hint === hint)
          ? "masked-lookup"
          : "focused-or-skipped-test";
        fail(rule, `${testFile}:${index + 1}`, hint);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// R5 — the journeys' French copy still exists in the app
// ---------------------------------------------------------------------------

/**
 * The E2E suite is a black box: it imports none of the app's packages, so every string it
 * clicks on is a copy of a content dictionary rather than a reference to one. Left uncompared,
 * that copy drifts, and it surfaces as the worst failure a suite can produce: a selector finding
 * nothing, minutes into CI, pointing at the test rather than at the wording that moved.
 *
 * Each entry in e2e/support/copy.ts names the dictionary it came from. This checks the text is
 * still in there, which turns a rename into a failure that names both sides, before the commit.
 */
const MIRRORS = /\bmirrors\(\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*,?\s*\)/g;

if (exists(E2E_COPY)) {
  const entries = Array.from(read(E2E_COPY).matchAll(MIRRORS));

  if (entries.length === 0) {
    fail(
      "unmirrored-e2e-copy",
      E2E_COPY,
      "no mirrors(...) entry found. Either the file stopped declaring where its strings come from, or this rule stopped reading it.",
    );
  }

  for (const [, rawDictionary, rawText] of entries) {
    const dictionary = JSON.parse(rawDictionary);
    const text = JSON.parse(rawText);
    const source = join(CONTENT_ROOT, dictionary);

    if (!exists(source)) {
      fail("unmirrored-e2e-copy", E2E_COPY, `names ${source}, which does not exist.`);
      continue;
    }
    if (!read(source).includes(text)) {
      fail(
        "unmirrored-e2e-copy",
        E2E_COPY,
        `${source} no longer contains "${text}". The wording changed: update the journey's copy to match, do not delete the entry.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (failures.length === 0) {
  const counted = `${testFiles.length} test files, ${functionNames.length} Edge Functions`;
  console.log(`check-tests: OK (${counted})`);
  process.exit(0);
}

const byRule = new Map();
for (const failure of failures) {
  const bucket = byRule.get(failure.rule) ?? [];
  bucket.push(failure);
  byRule.set(failure.rule, bucket);
}

console.error(`check-tests: ${failures.length} problem(s)\n`);
for (const [rule, bucket] of byRule) {
  console.error(`  [${rule}]`);
  for (const { file, message } of bucket) {
    console.error(`    ${relative(".", file)}`);
    console.error(`      ${message}`);
  }
  console.error("");
}
process.exit(1);
