import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "#client/database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

export type { AuthChangeEvent, AuthError, Session, User } from "@supabase/supabase-js";

// Browser/app client, scoped by the anon key — all security relies on RLS policies.
export const createBrowserSupabaseClient = (url: string, anonKey: string): TypedSupabaseClient =>
  createClient<Database>(url, anonKey);

// service_role client — bypasses RLS. Edge Functions and server scripts only.
// Never instantiate this in apps/web: the key must never reach the client.
export const createServiceRoleSupabaseClient = (
  url: string,
  serviceRoleKey: string,
): TypedSupabaseClient =>
  createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
