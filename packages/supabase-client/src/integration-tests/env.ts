// Default local `supabase start` keys: identical on every unconfigured local instance,
// not a secret. Overridable via env vars for CI.
export const LOCAL_SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:57321";

export const LOCAL_ANON_KEY =
  process.env["SUPABASE_ANON_KEY"] ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

/**
 * Direct Postgres connection, used only by the suites that read the catalog (pg_constraint,
 * pg_policies) or call a plpgsql function straight; none of that is reachable through
 * PostgREST, and adding a database function just so a test could call it would mean shipping
 * surface area for the tests' benefit.
 */
export const LOCAL_DATABASE_URL =
  process.env["SUPABASE_DB_URL"] ?? "postgresql://postgres:postgres@127.0.0.1:57322/postgres";

export const LOCAL_SERVICE_ROLE_KEY =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
