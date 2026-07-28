import {
  createBrowserSupabaseClient,
  createServiceRoleSupabaseClient,
  type TypedSupabaseClient,
} from "#client/client";
import {
  LOCAL_ANON_KEY,
  LOCAL_SERVICE_ROLE_KEY,
  LOCAL_SUPABASE_URL,
} from "#client/integration-tests/env";

export const serviceRoleClient = (): TypedSupabaseClient =>
  createServiceRoleSupabaseClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY);

export const anonClient = (): TypedSupabaseClient =>
  createBrowserSupabaseClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY);

/**
 * Reads a row the test cannot continue without. A `?? ""` fallback in its place turns a query
 * that returned nothing into a delete on the empty id — the assertion that follows then passes
 * for the wrong reason, which is exactly the failure an RLS suite must never produce.
 */
export const must = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${what}: the query returned no row.`);
  }
  return value;
};

export interface TestUser {
  id: string;
  email: string;
  client: TypedSupabaseClient;
}

let counter = 0;

// Creates a confirmed user (admin API, service_role) then signs in with a regular anon-key client.
export const createTestUser = async (firstName: string): Promise<TestUser> => {
  counter += 1;
  const admin = serviceRoleClient();
  const email = `test-rls-${Date.now()}-${counter}@example.test`;
  const password = "TestPassword1234!";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });
  if (error || !data.user) {
    throw new Error(`failed to create test user: ${error?.message}`);
  }

  const client = createBrowserSupabaseClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`failed to sign in test user: ${signInError.message}`);
  }

  return { id: data.user.id, email, client };
};

// A seeded catalog procedure, used as a tracking target in tests.
export const fetchAProcedureId = async (): Promise<string> => {
  const { data, error } = await anonClient().from("procedures").select("id").limit(1).single();
  if (error || !data) {
    throw new Error(`no catalog procedure found for tests: ${error?.message}`);
  }
  return data.id;
};
