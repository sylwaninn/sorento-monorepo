const required = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const optional = (name: string): string | null => Deno.env.get(name) ?? null;

// Hosts a locally-running Supabase stack can answer on. Inside the edge runtime container
// SUPABASE_URL points at the Kong gateway by its service name, not at the browser-facing URL.
const LOCAL_SUPABASE_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "kong",
  "host.docker.internal",
  "supabase_kong_sorento-monorepo",
]);

export const isLocalSupabaseUrl = (url: string): boolean => {
  try {
    return LOCAL_SUPABASE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
};

/**
 * The gate for development-only endpoints, as a pure decision rather than a value frozen at
 * module load: the combinations that matter (a deployed URL with APP_ENV set, a local URL
 * without it) cannot be reached otherwise, and an unasserted gate is an assumed gate.
 *
 * Two independent signals must agree: an explicit opt-in (APP_ENV lives only in the gitignored
 * local .env, so a deployed environment never has it) and a Supabase URL that can only belong
 * to a local stack. Either signal alone would leave the gate one misconfiguration away from
 * unlocking service_role behaviour on a real environment.
 */
export const isDevelopmentEnvironment = (
  appEnv: string | undefined,
  supabaseUrl: string,
): boolean => appEnv === "development" && isLocalSupabaseUrl(supabaseUrl);

const supabaseUrl = required("SUPABASE_URL");

// Read once, at module load: a missing required secret should stop the function outright
// rather than surface as a confusing runtime failure on the first request.
export const env = {
  supabaseUrl,
  anonKey: required("SUPABASE_ANON_KEY"),
  serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  siteUrl: Deno.env.get("SITE_URL") ?? "http://localhost:5173",
  resendApiKey: optional("RESEND_API_KEY"),
  resendFromEmail: Deno.env.get("RESEND_FROM_EMAIL") ?? "notifications@example.com",
  cronSecret: optional("CRON_SECRET"),
  supportEmail: optional("SUPPORT_EMAIL"),
  isDevelopment: isDevelopmentEnvironment(Deno.env.get("APP_ENV"), supabaseUrl),
} as const;
