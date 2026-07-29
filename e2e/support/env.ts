/**
 * Local `supabase start` defaults. These keys are identical on every unconfigured local
 * instance and are not secrets; CI overrides them through the environment.
 */
export const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:57321";

export const ANON_KEY =
  process.env["SUPABASE_ANON_KEY"] ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const SERVICE_ROLE_KEY =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// Pinned by supabase/seed.sql so the cron-guarded jobs can be driven from a test.
export const CRON_SECRET = process.env["CRON_SECRET"] ?? "local-dev-cron-secret";

/**
 * A port of its own, and localhost rather than 127.0.0.1.
 *
 * The port keeps the journeys off 5173, where a developer's `pnpm dev` lives: Playwright reuses
 * an existing server, so sharing the port means the suite silently tests the dev server instead
 * of the production build it exists to test.
 *
 * The host is not interchangeable. supabase/config.toml declares a strict redirect allow-list on
 * this exact origin, so a link out of a confirmation email is refused from the other one, and a
 * session stored under one origin would be invisible to the other. The journeys have to run where
 * the emails point.
 */
export const APP_URL = process.env["E2E_APP_URL"] ?? "http://localhost:5273";

/** Mailpit catches everything the local stack sends, which is what makes an email link followable. */
export const MAILPIT_URL = process.env["MAILPIT_URL"] ?? "http://127.0.0.1:57324";
