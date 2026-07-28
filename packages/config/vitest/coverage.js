/**
 * Shared coverage gate. Every package states its own thresholds (a single monorepo-wide
 * number would be meaningless across layers whose risk profiles differ by an order of
 * magnitude), but they all measure the same way, so adding a package is one call, not a
 * fresh set of decisions about reporters and exclusions.
 *
 * Thresholds are a ratchet: they may go up, never down. Lowering one to make CI pass is
 * the change under review, not a fix.
 */

// Barrel files re-export without executing anything meaningful, and fixtures exist to serve
// tests. Counting either measures import wiring, not tested behaviour.
const ALWAYS_EXCLUDED = [
  "src/index.ts",
  "**/index.ts",
  "**/test-fixtures.ts",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.d.ts",
];

export const coverageConfig = ({ include, exclude = [], thresholds }) => ({
  provider: "v8",
  // "text" for the local run, "lcov" so CI can publish it, "json-summary" so a future
  // badge or trend job has a machine-readable source.
  reporter: ["text", "lcov", "json-summary"],
  include,
  exclude: [...ALWAYS_EXCLUDED, ...exclude],
  // Fail the run rather than print a red table nobody reads.
  thresholds,
  // Without this, a file no test imports is simply absent from the report, and a whole
  // untested module raises the percentage by not existing.
  all: true,
});
