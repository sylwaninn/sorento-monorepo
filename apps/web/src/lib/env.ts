/** An empty value is an unset one: a deployment that forgot the variable sets it to "". */
const optionalEnv = (name: keyof ImportMetaEnv): string | undefined => {
  const value = import.meta.env[name];
  return value === undefined || value === "" ? undefined : value;
};

const requireEnv = (name: keyof ImportMetaEnv): string => {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Check your .env file (see .env.example).`,
    );
  }
  return value;
};

export const env = {
  supabaseUrl: requireEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: requireEnv("VITE_SUPABASE_ANON_KEY"),
  /**
   * The public origin, known only where the build was told it. Optional on purpose: a canonical
   * address pointing at a guessed domain is worse for a search engine than no canonical at all.
   */
  siteUrl: optionalEnv("VITE_SITE_URL"),
  // Vite inlines this as a literal at build time, so a production bundle drops the
  // development-only branches entirely instead of shipping them behind a runtime test.
  isDevelopment: import.meta.env.DEV,
};
