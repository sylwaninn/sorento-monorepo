import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { env } from "@shared/env.ts";

export type EdgeSupabaseClient = SupabaseClient;

/** Runs under the caller's JWT: RLS applies, which is the point of using it for reads. */
export const callerClient = (request: Request): EdgeSupabaseClient =>
  createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

/** Bypasses RLS. Only for what the caller legitimately cannot do under their own policies. */
export const serviceClient = (): EdgeSupabaseClient =>
  createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export const currentUser = async (request: Request): Promise<User | null> => {
  const {
    data: { user },
  } = await callerClient(request).auth.getUser();
  return user;
};

/**
 * One admin lookup per batch instead of one per member: these loops used to call
 * getUserById inside a per-member iteration, which is a round trip per recipient.
 */
export const emailsByUserId = async (
  client: EdgeSupabaseClient,
  userIds: readonly string[],
): Promise<Map<string, string>> => {
  const unique = [...new Set(userIds)];
  const entries = await Promise.all(
    unique.map(async (userId): Promise<[string, string] | null> => {
      const { data } = await client.auth.admin.getUserById(userId);
      const email = data?.user?.email;
      return email ? [userId, email] : null;
    }),
  );

  return new Map(entries.filter((entry): entry is [string, string] => entry !== null));
};
