import { createBrowserSupabaseClient } from "@sorento/supabase-client";
import { env } from "@/lib/env";

export const supabase = createBrowserSupabaseClient(env.supabaseUrl, env.supabaseAnonKey);
