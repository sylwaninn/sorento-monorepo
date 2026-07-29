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

export const APP_URL = process.env["E2E_APP_URL"] ?? "http://127.0.0.1:5173";
