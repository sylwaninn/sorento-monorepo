import { defineConfig } from "vitest/config";
import { coverageConfig } from "@sorento/config/vitest-coverage";

/**
 * core holds every business rule, it is pure, and CLAUDE.md requires each rule to arrive with
 * its tests. Nothing here is hard to reach: an uncovered branch in this package means a rule
 * nobody asserted, so the bar is the highest in the monorepo.
 */
export default defineConfig({
  test: {
    coverage: coverageConfig({
      include: ["src/**/*.ts"],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    }),
  },
});
