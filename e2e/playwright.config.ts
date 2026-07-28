import { defineConfig, devices } from "@playwright/test";
import { ANON_KEY, APP_URL, SUPABASE_URL } from "#e2e/support/env";

const isCI = Boolean(process.env["CI"]);

/**
 * End-to-end journeys against the real stack: the built app in a browser, a local Supabase, real
 * RLS, real Edge Functions. Nothing is mocked, because the point of these is the part no other
 * suite sees: a screen, a policy and a function disagreeing about what a user may do.
 *
 * The app is served from a production build rather than the dev server: a journey that only
 * works with hot reload and unminified React is not the journey users get.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.e2e\.ts/,
  // Every journey creates its own users and its own dossier, so they never contend for state.
  fullyParallel: true,
  // Capped in CI: the journeys create confirmed accounts, and GoTrue rate-limits that hard
  // enough that more workers make the suite slower by way of retries.
  ...(isCI ? { workers: 2 } : {}),
  // A journey that only passes on the second attempt is a flaky journey; surface it locally.
  retries: isCI ? 1 : 0,
  forbidOnly: isCI,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: APP_URL,
    // Dates are entered through segmented fields whose order follows the locale. Pinning it
    // keeps "01/02/2026" meaning the same thing on a developer machine and in CI.
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: isCI ? "retain-on-failure" : "off",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command:
      "pnpm --filter @sorento/web build && pnpm --filter @sorento/web preview --port 5173 --host 127.0.0.1",
    url: APP_URL,
    reuseExistingServer: !isCI,
    // The first run pays for a full production build of the app.
    timeout: 300_000,
    env: { VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: ANON_KEY },
  },
});
