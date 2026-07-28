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
import type { Dossier, DossierRole, DossierStatus } from "@sorento/domain";
import { DossierRepository } from "#client/repositories/dossier-repository";

export const serviceRoleClient = (): TypedSupabaseClient =>
  createServiceRoleSupabaseClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY);

export const anonClient = (): TypedSupabaseClient =>
  createBrowserSupabaseClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY);

/**
 * Reads a row the test cannot continue without. A `?? ""` fallback in its place turns a query
 * that returned nothing into a delete on the empty id. The assertion that follows then passes
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

export const createActiveTestDossier = async (
  owner: TestUser,
  subjectFirstName: string,
  subjectLastName: string,
): Promise<Dossier> => {
  const repository = new DossierRepository(owner.client);
  const dossier = await repository.create({
    subjectFirstName,
    subjectLastName,
    status: "PREPARATION",
  });
  return repository.activate(dossier.id, "2026-01-15");
};

/**
 * Every fixture dossier is about the same person. No policy depends on the subject's identity,
 * so a different name per describe would only be one more line to read past before reaching
 * what the test is actually about.
 */
const FIXTURE_SUBJECT = { firstName: "Michel", lastName: "Dupont" } as const;

export interface OwnedDossier {
  readonly owner: TestUser;
  readonly dossierId: string;
}

// The owner-plus-dossier opening almost every suite starts from, in one line.
export const createOwnedDossier = async (options: {
  readonly ownerName: string;
  readonly status: DossierStatus;
}): Promise<OwnedDossier> => {
  const owner = await createTestUser(options.ownerName);
  const dossier =
    options.status === "ACTIVE"
      ? await createActiveTestDossier(owner, FIXTURE_SUBJECT.firstName, FIXTURE_SUBJECT.lastName)
      : await new DossierRepository(owner.client).create({
          subjectFirstName: FIXTURE_SUBJECT.firstName,
          subjectLastName: FIXTURE_SUBJECT.lastName,
          status: "PREPARATION",
        });

  return { owner, dossierId: dossier.id };
};

/**
 * Memberships created as fixture data go through service_role, here and nowhere else through
 * the owner's client. Adding a member is itself a policy (memberships_insert): proving it again
 * in a hook would put a security assertion where a refusal reads as a broken fixture, and a
 * describe that needs a viewer would fail for a reason it never meant to test. The permission
 * itself is asserted once, through the real client, by the describe that owns that policy.
 */
export const grantMembership = async (
  dossierId: string,
  user: TestUser,
  role: DossierRole,
): Promise<string> => {
  const { data, error } = await serviceRoleClient()
    .from("memberships")
    .insert({ dossier_id: dossierId, user_id: user.id, role })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`failed to grant ${role} membership: ${error?.message}`);
  }
  return data.id;
};

// A new signed-in user, already a member of the dossier with the role the test needs.
export const createMember = async (
  dossierId: string,
  role: DossierRole,
  firstName: string,
): Promise<TestUser> => {
  const user = await createTestUser(firstName);
  await grantMembership(dossierId, user, role);
  return user;
};

// A seeded catalog procedure, used as a tracking target in tests.
export const fetchAProcedureId = async (): Promise<string> => {
  const { data, error } = await anonClient().from("procedures").select("id").limit(1).single();
  if (error || !data) {
    throw new Error(`no catalog procedure found for tests: ${error?.message}`);
  }
  return data.id;
};
