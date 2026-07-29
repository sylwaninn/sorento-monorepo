#!/usr/bin/env node
/**
 * Keeps each package's coverage thresholds pressed up against what it actually achieves.
 *
 * A threshold set once and left behind stops being a gate: coverage drifts up, slack opens
 * underneath, and a change can then delete a hundred covered lines without the build noticing.
 * The number only ever goes up.
 *
 *   node scripts/ratchet-coverage.mjs           raise every threshold to what is achieved
 *   node scripts/ratchet-coverage.mjs --check   fail when too much slack has opened up
 *
 * Run `pnpm test:coverage` first: this reads the reports, it does not produce them.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PACKAGES = [
  "packages/core",
  "packages/domain",
  "packages/supabase-client",
  "apps/web",
];

/**
 * How far actual coverage may run ahead of the threshold before the ratchet has to be pulled.
 * Some slack is necessary (a threshold pinned to the exact number breaks on a one-line change
 * that happens to be uncovered), but slack is also where a regression hides, so it is bounded.
 */
const MAX_SLACK = 5;

const METRICS = ["lines", "statements", "functions", "branches"];
const isCheck = process.argv.includes("--check");

const readAchieved = (packagePath) => {
  const summaryPath = join(ROOT, packagePath, "coverage/coverage-summary.json");
  if (!existsSync(summaryPath)) return null;

  const total = JSON.parse(readFileSync(summaryPath, "utf8")).total;
  return Object.fromEntries(METRICS.map((metric) => [metric, Math.floor(total[metric].pct)]));
};

const readDeclared = (source) =>
  Object.fromEntries(
    METRICS.map((metric) => {
      const match = new RegExp(`${metric}:\\s*(\\d+)`).exec(source);
      return [metric, match === null ? null : Number(match[1])];
    }),
  );

const problems = [];
const raised = [];

for (const packagePath of PACKAGES) {
  const configPath = join(ROOT, packagePath, "vitest.config.ts");
  if (!existsSync(configPath)) continue;

  const achieved = readAchieved(packagePath);
  if (achieved === null) {
    problems.push(`${packagePath}: no coverage report. Run \`pnpm test:coverage\` first.`);
    continue;
  }

  const source = readFileSync(configPath, "utf8");
  const declared = readDeclared(source);
  let updated = source;

  for (const metric of METRICS) {
    const current = declared[metric];
    if (current === null) continue;

    const slack = achieved[metric] - current;
    if (slack <= MAX_SLACK) continue;

    if (isCheck) {
      problems.push(
        `${packagePath} ${metric}: threshold ${current}%, achieved ${achieved[metric]}%` +
          `: ${slack} points of slack. Run \`pnpm coverage:ratchet\`.`,
      );
      continue;
    }

    updated = updated.replace(
      new RegExp(`(${metric}:\\s*)${current}\\b`),
      `$1${achieved[metric]}`,
    );
    raised.push(`${packagePath} ${metric}: ${current}% -> ${achieved[metric]}%`);
  }

  if (!isCheck && updated !== source) writeFileSync(configPath, updated);
}

if (problems.length > 0) {
  console.error("ratchet-coverage: thresholds have fallen behind\n");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    "\nA threshold below what the suite achieves is slack a regression can hide in." +
      " Raising it is the point; lowering one to make a red build green is the change under review.",
  );
  process.exit(1);
}

if (isCheck) {
  console.log(`ratchet-coverage: OK (no package more than ${MAX_SLACK} points ahead)`);
  process.exit(0);
}

if (raised.length === 0) {
  console.log("ratchet-coverage: nothing to raise");
  process.exit(0);
}

console.log("ratchet-coverage: raised\n");
for (const entry of raised) console.log(`  ${entry}`);
console.log("\nCommit the updated vitest configs.");
