import { createHash, randomBytes } from "node:crypto";
import { ANON_KEY, CRON_SECRET, SERVICE_ROLE_KEY, SUPABASE_URL } from "#e2e/support/env";

/**
 * The parts of a journey a browser cannot reach.
 *
 * Two of them now, precisely: the passage of time, and one token that no email carries locally.
 * Everything else goes through the UI, and everything a server decides goes through the endpoint
 * that decides it. A helper that created a dossier with service_role would be testing the
 * fixture, not the app.
 *
 * Confirmation emails used to be on that list. They are not: the local stack posts them to
 * Mailpit, so a journey can open the mailbox, follow the link a person would click, and prove the
 * whole round trip rather than assuming the middle of it.
 *
 * Spoken to over plain HTTP rather than through @sorento/supabase-client. These journeys are a
 * black box around the built application: linking them against the app's own packages would let
 * a shared bug hide itself, and would make the suite need a workspace build before it can run.
 */

const serviceHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
} as const;

/**
 * A service_role call against PostgREST, for seeding a precondition and for reading back what a
 * journey cannot see on screen. Exported so an area's own journey can add the reads it needs
 * without every one of them queueing behind this file.
 *
 * The generic is asserted, not validated: the journeys import none of the app's packages, so
 * there is no schema to parse with, and PostgREST's shapes are pinned by the select strings a
 * line above each call. The one cast in the suite lives here, on purpose, where it is visible.
 */
export const rest = async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { ...serviceHeaders, ...init.headers },
  });
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} answered ${response.status}`);
  }
  return (await response.json()) as T;
};

// The journeys import none of the app's packages, so the narrowing is done by hand: a field
// is read through Object.entries and type-checked, never asserted.
const stringField = (row: unknown, name: string, what: string): string => {
  if (typeof row !== "object" || row === null) throw new Error(`${what}: expected a row`);
  const entry = Object.entries(row).find(([key]) => key === name);
  if (!entry || typeof entry[1] !== "string") {
    throw new Error(`${what}: expected a string field "${name}"`);
  }
  return entry[1];
};

const listOf = (value: unknown, what: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${what}: expected an array`);
  return value;
};

/**
 * Creates an already-confirmed account, standing in for the confirmation email.
 *
 * The signup screen offers a development shortcut for exactly this, but Vite strips it from a
 * production build and these journeys run against the production build on purpose. So the
 * account is provisioned here and the journey signs in through the real login screen.
 */
export const createConfirmedAccount = async (
  email: string,
  password: string,
  firstName: string,
): Promise<string> => {
  const body = JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });

  // Workers create their accounts at the same moment and GoTrue rate-limits that, which shows up
  // as a 500 with nothing wrong in the request. Retried with a growing pause rather than by
  // serialising the whole suite, which would cost far more than the occasional second wasted.
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return stringField(await rest("/auth/v1/admin/users", { method: "POST", body }), "id", email);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error(`could not create ${email}: ${String(lastError)}`);
};

/**
 * Reports a death the way a consented trusted contact does, by spending their activation link.
 *
 * The link is sent by email and local development sends none: the mailer skips silently without
 * a provider key, so the token it carries exists nowhere a test could read it. Only that one step
 * is faked. The token is planted on the designation, hashed exactly as _shared/token.ts hashes
 * it, and then spent against the real endpoint.
 *
 * Writing the resulting columns here instead would have been shorter and wrong: the grace period,
 * the freeze the job later reads and the notification every member gets would then be stated
 * twice, and the copy in this file would keep passing after the function changed its mind. It
 * also means this is the only place the activation endpoint is exercised on its happy path.
 */
export const requestActivation = async (dossierId: string, deathDate: string): Promise<void> => {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const planted = listOf(
    await rest(`/rest/v1/trusted_contact_designations?dossier_id=eq.${dossierId}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        activation_token_hash: tokenHash,
        activation_expires_at: expiresAt.toISOString(),
      }),
    }),
    `designations of ${dossierId}`,
  );
  if (planted.length === 0) {
    throw new Error(`dossier ${dossierId} has no designated trusted contact to report a death`);
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/request-dossier-activation`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, deathDate }),
  });
  if (!response.ok) {
    throw new Error(
      `request-dossier-activation answered ${response.status}: ${await response.text()}`,
    );
  }
  await response.body?.cancel();
};

export const designateConsentedTrustedContact = async (
  dossierId: string,
  trustedUserId: string,
  trustedEmail: string,
  invitedBy: string,
  futureRole: "owner" | "collaborator",
): Promise<void> => {
  await rest("/rest/v1/memberships", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      dossier_id: dossierId,
      user_id: trustedUserId,
      role: "trusted_contact",
      invited_by: invitedBy,
    }),
  });
  await rest("/rest/v1/trusted_contact_designations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      dossier_id: dossierId,
      email: trustedEmail,
      future_role: futureRole,
      invited_by: invitedBy,
      consented_by: trustedUserId,
      consented_at: new Date().toISOString(),
    }),
  });
};

/**
 * Brings the activation deadline forward instead of waiting out the 48-hour grace period. The
 * freeze is a timestamp the job compares against now(), so moving it into the past puts the
 * dossier in the state it would reach on its own two days later.
 */
export const expireActivationGrace = async (dossierId: string): Promise<void> => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/dossiers?id=eq.${dossierId}`, {
    method: "PATCH",
    headers: { ...serviceHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({
      pending_activation_effective_at: new Date(Date.now() - 60_000).toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`could not expire activation grace: ${response.status}`);
  await response.body?.cancel();
};

/** Runs a cron-guarded job the way the scheduler does, with the shared secret. */
export const runCronJob = async (name: string): Promise<void> => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { ...serviceHeaders, "x-cron-secret": CRON_SECRET },
    body: "{}",
  });
  if (!response.ok) throw new Error(`${name} answered ${response.status}`);
  await response.body?.cancel();
};

export const dossierStatus = async (dossierId: string): Promise<string> => {
  const rows = listOf(
    await rest(`/rest/v1/dossiers?select=status&id=eq.${dossierId}`),
    `dossier ${dossierId}`,
  );
  if (rows.length === 0) throw new Error(`dossier ${dossierId} not found`);
  return stringField(rows[0], "status", `dossier ${dossierId}`);
};

export const membershipRole = async (
  dossierId: string,
  userId: string,
): Promise<string | undefined> => {
  const rows = listOf(
    await rest(`/rest/v1/memberships?select=role&dossier_id=eq.${dossierId}&user_id=eq.${userId}`),
    `membership of ${userId}`,
  );
  return rows.length === 0 ? undefined : stringField(rows[0], "role", `membership of ${userId}`);
};

/** Notification rows of one type for one member: what the bell and the mailer will read. */
export const notificationCount = async (
  dossierId: string,
  userId: string,
  type: string,
): Promise<number> => {
  const rows = listOf(
    await rest(
      `/rest/v1/notifications?select=id&dossier_id=eq.${dossierId}&user_id=eq.${userId}&type=eq.${type}`,
    ),
    `notifications of ${userId}`,
  );
  return rows.length;
};
