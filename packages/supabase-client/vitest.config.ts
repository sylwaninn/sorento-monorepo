import { defineConfig } from "vitest/config";
import { coverageConfig } from "@sorento/config/vitest-coverage";

/**
 * Default config: unit tests only, no network. The RLS suites live in
 * vitest.integration.config.ts and need a local `supabase start`.
 *
 * Only the pure part of the package is measured. Repositories and client.ts are query builders
 * whose behaviour is whatever Postgres does with them — a unit test would assert against a mock
 * of the fluent API, which passes just as happily when a policy denies the read. They are
 * covered by the integration suites instead, against a real database.
 *
 * What is measured is what a unit test can actually falsify: the row-to-domain mappers, where a
 * swapped column is invisible to the type system, and the error helpers every repository
 * funnels through.
 */
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "src/integration-tests/**"],
    coverage: coverageConfig({
      include: ["src/mappers/**/*.ts", "src/errors.ts"],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    }),
  },
});
