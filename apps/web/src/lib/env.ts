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
  // Vite inlines this as a literal at build time, so a production bundle drops the
  // development-only branches entirely instead of shipping them behind a runtime test.
  isDevelopment: import.meta.env.DEV,
};
