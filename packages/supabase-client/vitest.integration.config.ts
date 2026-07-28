import { defineConfig } from "vitest/config";

/**
 * RLS integration tests — require a local `supabase start`. Not part of `pnpm test`.
 * Sequential on purpose: every file talks to the same database and creates confirmed users,
 * which in parallel trips the Auth rate limiter and fails for reasons unrelated to the
 * policies under test.
 */
export default defineConfig({
  test: {
    fileParallelism: false,
    include: ["src/integration-tests/**/*.test.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
