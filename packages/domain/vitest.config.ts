import { defineConfig } from "vitest/config";
import { coverageConfig } from "@sorento/config/vitest-coverage";

/**
 * domain is the validation boundary of the whole app, and it is pure, so there is no reason for
 * any of it to go unverified. Coverage is held at 100%, but the number that actually governs
 * this package is its mutation score (stryker.config.json, break at 95): every schema here is
 * a contract, and a contract nobody asserts is a contract that can be loosened by accident.
 *
 * Line coverage on a declarative package is cheap to fake — importing a module executes its
 * `z.object(...)` calls without asserting anything. The mutation score is what makes that
 * impossible, which is why it, not this file, is the real gate.
 */
export default defineConfig({
  test: {
    coverage: coverageConfig({
      include: ["src/**/*.ts"],
      // Type-only module: it compiles to nothing, so it can never be executed.
      exclude: ["src/ports.ts"],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    }),
  },
});
