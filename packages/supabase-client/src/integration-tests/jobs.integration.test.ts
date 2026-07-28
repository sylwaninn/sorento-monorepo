import { beforeAll, describe, expect, it } from "vitest";
import { NotificationPreferenceRepository } from "#client/repositories/notification-preference-repository";
import { TrackingRepository } from "#client/repositories/tracking-repository";
import { DossierRepository } from "#client/repositories/dossier-repository";
import { LOCAL_ANON_KEY, LOCAL_SUPABASE_URL } from "#client/integration-tests/env";
import {
  anonClient,
  createActiveTestDossier,
  createTestUser,
  must,
  serviceRoleClient,
  type TestUser,
} from "#client/integration-tests/helpers";

/**
 * The three scheduled jobs, driven over real HTTP with the cron secret the scheduler uses.
 *
 * The Edge Function suite asks what each one does for a caller who is nobody. This one asks the
 * opposite question, the one a job is written for: given the state it is supposed to react to,
 * does it react once, to the right person, and not again on the next tick? A scheduled job is
 * invoked by a machine that can invoke it twice, so "sends once" is the property that matters
 * most and the one nothing covered.
 *
 * Assertions are on the rows the jobs write, never on a message leaving the machine: the local
 * stack has no RESEND_API_KEY, so sendEmail reports skipped_no_key and the observable effect of
 * a send is the delivery bookkeeping (email_status, email_last_attempt_at, email_attempts).
 *
 * Deliberately not covered here: that a reminder whose procedure was completed between planning
 * and sending is dropped before the send. Locally it settles the row exactly as a successful
 * send does, so the two are indistinguishable from the database. It needs a stubbed provider,
 * which belongs to a unit test of the function body rather than to this suite.
 */

// Pinned by supabase/seed.sql and by the CI workflow, so a cron-guarded job can be driven.
const CRON_SECRET = process.env["CRON_SECRET"] ?? "local-dev-cron-secret";

// Only the numeric counters a job reports; anything else in the body is not a count and a
// missing one has to read as missing rather than as zero.
const countsOf = (body: object): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "number") counts[key] = value;
  }
  return counts;
};

const runJob = async (name: string): Promise<Record<string, number>> => {
  const response = await fetch(`${LOCAL_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: LOCAL_ANON_KEY,
      "Content-Type": "application/json",
      "x-cron-secret": CRON_SECRET,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`${name} answered ${response.status}: ${await response.text()}`);
  }

  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null) {
    throw new Error(`${name} answered with ${String(body)} rather than a result object`);
  }
  return countsOf(body);
};

const counted = (body: Record<string, number>, key: string): number =>
  must(body[key], `"${key}" in the job result`);

interface NotificationRow {
  id: string;
  type: string;
  email_status: string;
  email_attempts: number;
  email_last_attempt_at: string | null;
  payload: unknown;
}

const COLUMNS = "id, type, email_status, email_attempts, email_last_attempt_at, payload";

const notificationsOf = async (
  userId: string,
  dossierId: string,
  type: string,
): Promise<NotificationRow[]> => {
  const { data, error } = await serviceRoleClient()
    .from("notifications")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("dossier_id", dossierId)
    .eq("type", type)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`failed to read notifications: ${error.message}`);
  return must(data, `notifications of type ${type}`);
};

const onlyNotification = async (
  userId: string,
  dossierId: string,
  type: string,
): Promise<NotificationRow> => {
  const rows = await notificationsOf(userId, dossierId, type);
  expect(rows).toHaveLength(1);
  return must(rows[0], `the ${type} notification`);
};

const readNotification = async (id: string): Promise<NotificationRow> => {
  const { data, error } = await serviceRoleClient()
    .from("notifications")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`failed to read notification ${id}: ${error.message}`);
  return must(data, `notification ${id}`);
};

// The reactive triggers insert exactly like this; seeding through them would need a second
// user and an action, which is state this suite is not asserting on.
const seedNotification = async (input: {
  userId: string;
  dossierId: string;
  type: string;
  emailStatus: string;
  attempts?: number;
}): Promise<string> => {
  const { data, error } = await serviceRoleClient()
    .from("notifications")
    .insert({
      user_id: input.userId,
      dossier_id: input.dossierId,
      type: input.type,
      target_id: null,
      payload: {},
      email_status: input.emailStatus,
      email_attempts: input.attempts ?? 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(`failed to seed a notification: ${error.message}`);
  return must(data, "the seeded notification").id;
};

interface CatalogProcedure {
  id: string;
  title: string;
}

const fetchProcedures = async (count: number): Promise<CatalogProcedure[]> => {
  const { data, error } = await anonClient().from("procedures").select("id, title").limit(count);
  if (error) throw new Error(`no catalog procedure found for tests: ${error.message}`);

  const rows = must(data, "catalog procedures");
  if (rows.length < count) {
    throw new Error(`the catalog holds ${rows.length} procedures, the suite needs ${count}`);
  }
  return rows;
};

const addCollaborator = async (dossierId: string, user: TestUser): Promise<void> => {
  const { error } = await serviceRoleClient()
    .from("memberships")
    .insert({ dossier_id: dossierId, user_id: user.id, role: "collaborator" });
  if (error) throw new Error(`failed to add collaborator: ${error.message}`);
};

/**
 * A dossier whose only open item is one catalog procedure. The death date is months past, so
 * every deadline computed from it has come and gone: the reminder window is the state under
 * test, not the arithmetic behind it, which packages/core already covers.
 */
const dossierWithOneProcedure = async (
  owner: TestUser,
  procedure: CatalogProcedure,
): Promise<{ dossierId: string; trackingId: string }> => {
  const dossier = await createActiveTestDossier(owner, "Jean", "Durand");
  const tracking = await new TrackingRepository(owner.client).createForProcedure(
    dossier.id,
    procedure.id,
  );
  return { dossierId: dossier.id, trackingId: tracking.id };
};

describe("daily-reminders", () => {
  let procedure: CatalogProcedure;
  let owner: TestUser;
  let assignee: TestUser;
  let optedOut: TestUser;
  let inAppOnly: TestUser;
  let ownDossier: { dossierId: string; trackingId: string };
  let assignedDossier: { dossierId: string; trackingId: string };
  let optedOutDossier: { dossierId: string; trackingId: string };
  let inAppOnlyDossier: { dossierId: string; trackingId: string };

  beforeAll(async () => {
    procedure = must((await fetchProcedures(1))[0], "a catalog procedure");

    owner = await createTestUser("Olivia");
    assignee = await createTestUser("Adam");
    optedOut = await createTestUser("Odile");
    inAppOnly = await createTestUser("Ines");

    ownDossier = await dossierWithOneProcedure(owner, procedure);

    assignedDossier = await dossierWithOneProcedure(owner, procedure);
    await addCollaborator(assignedDossier.dossierId, assignee);
    await new TrackingRepository(owner.client).update(assignedDossier.trackingId, {
      assignedTo: assignee.id,
    });

    optedOutDossier = await dossierWithOneProcedure(optedOut, procedure);
    const optedOutPreferences = new NotificationPreferenceRepository(optedOut.client);
    await optedOutPreferences.setPreference(optedOut.id, "deadline_approaching", false, false);
    await optedOutPreferences.setPreference(optedOut.id, "prolonged_waiting", false, false);

    inAppOnlyDossier = await dossierWithOneProcedure(inAppOnly, procedure);
    await new NotificationPreferenceRepository(inAppOnly.client).setPreference(
      inAppOnly.id,
      "deadline_approaching",
      true,
      false,
    );

    const result = await runJob("daily-reminders");
    expect(counted(result, "notificationsCreated")).toBeGreaterThanOrEqual(3);
    expect(counted(result, "emailsQueued")).toBeGreaterThanOrEqual(2);
  });

  it("plans one reminder for the owner of an unassigned procedure, queued for email", async () => {
    const row = await onlyNotification(owner.id, ownDossier.dossierId, "deadline_approaching");

    expect(row.email_status).toBe("pending");
    expect(row.payload).toEqual({
      deadlines: [{ trackingId: ownDossier.trackingId, title: procedure.title }],
      waiting: [],
      emailDeadlines: [{ trackingId: ownDossier.trackingId, title: procedure.title }],
      emailWaiting: [],
    });
  });

  // The assignee owns the reminder; chasing the owner about work someone else took on is the
  // failure mode this selection exists to prevent.
  it("sends the reminder to the assignee rather than to the owner", async () => {
    const row = await onlyNotification(
      assignee.id,
      assignedDossier.dossierId,
      "deadline_approaching",
    );

    expect(row.payload).toEqual({
      deadlines: [{ trackingId: assignedDossier.trackingId, title: procedure.title }],
      waiting: [],
      emailDeadlines: [{ trackingId: assignedDossier.trackingId, title: procedure.title }],
      emailWaiting: [],
    });
    expect(
      await notificationsOf(owner.id, assignedDossier.dossierId, "deadline_approaching"),
    ).toEqual([]);
  });

  it("plans nothing for someone who switched both reminder types off", async () => {
    expect(
      await notificationsOf(optedOut.id, optedOutDossier.dossierId, "deadline_approaching"),
    ).toEqual([]);
    expect(
      await notificationsOf(optedOut.id, optedOutDossier.dossierId, "prolonged_waiting"),
    ).toEqual([]);
  });

  // The in-app list and the email list are computed separately: an in-app reminder must not
  // drag an email along with it.
  it("queues no email for someone who kept the reminder in the app only", async () => {
    const row = await onlyNotification(
      inAppOnly.id,
      inAppOnlyDossier.dossierId,
      "deadline_approaching",
    );

    expect(row.email_status).toBe("not_applicable");
    expect(row.payload).toEqual({
      deadlines: [{ trackingId: inAppOnlyDossier.trackingId, title: procedure.title }],
      waiting: [],
      emailDeadlines: [],
      emailWaiting: [],
    });
  });
});

describe("daily-reminders runs twice in a day", () => {
  let owner: TestUser;
  let dossier: { dossierId: string; trackingId: string };

  beforeAll(async () => {
    const procedure = must((await fetchProcedures(1))[0], "a catalog procedure");
    owner = await createTestUser("Ivan");
    dossier = await dossierWithOneProcedure(owner, procedure);
  });

  // The cap is one reminder email per dossier per day. A scheduler that fires twice, or a
  // retried invocation, must not turn it into two.
  it("plans the reminder once, whatever the number of invocations", async () => {
    await runJob("daily-reminders");
    const afterFirst = await onlyNotification(owner.id, dossier.dossierId, "deadline_approaching");

    const second = await runJob("daily-reminders");
    const afterSecond = await onlyNotification(owner.id, dossier.dossierId, "deadline_approaching");

    expect(afterSecond.id).toBe(afterFirst.id);
    expect(counted(second, "notificationsCreated")).toBe(0);
    expect(counted(second, "emailsQueued")).toBe(0);
  });
});

describe("weekly-digest", () => {
  let subscriber: TestUser;
  let inAppOnly: TestUser;
  let silent: TestUser;
  let preparing: TestUser;
  let subscriberDossierId: string;
  let inAppOnlyDossierId: string;
  let silentDossierId: string;
  let preparingDossierId: string;

  beforeAll(async () => {
    const procedures = await fetchProcedures(2);
    const first = must(procedures[0], "the first catalog procedure");
    const second = must(procedures[1], "the second catalog procedure");

    subscriber = await createTestUser("Sofia");
    inAppOnly = await createTestUser("Ilan");
    silent = await createTestUser("Simon");
    preparing = await createTestUser("Pierre");

    // Two procedures, one of them settled today: the digest reports half done, one completed
    // this week and one left, which pins every number it computes rather than just its shape.
    const subscriberDossier = await dossierWithOneProcedure(subscriber, first);
    subscriberDossierId = subscriberDossier.dossierId;
    const tracking = new TrackingRepository(subscriber.client);
    await tracking.createForProcedure(subscriberDossierId, second.id);
    await tracking.update(subscriberDossier.trackingId, { status: "done" });
    await new NotificationPreferenceRepository(subscriber.client).setPreference(
      subscriber.id,
      "weekly_digest",
      true,
      true,
    );

    inAppOnlyDossierId = (await dossierWithOneProcedure(inAppOnly, first)).dossierId;
    await new NotificationPreferenceRepository(inAppOnly.client).setPreference(
      inAppOnly.id,
      "weekly_digest",
      true,
      false,
    );

    // No preference row at all: the digest defaults to off, and staying off is the assertion.
    silentDossierId = (await dossierWithOneProcedure(silent, first)).dossierId;

    const preparingDossier = await new DossierRepository(preparing.client).create({
      subjectFirstName: "Jean",
      subjectLastName: "Durand",
      status: "PREPARATION",
    });
    preparingDossierId = preparingDossier.id;
    await new TrackingRepository(preparing.client).createForProcedure(preparingDossierId, first.id);
    await new NotificationPreferenceRepository(preparing.client).setPreference(
      preparing.id,
      "weekly_digest",
      true,
      true,
    );

    expect(counted(await runJob("weekly-digest"), "created")).toBeGreaterThanOrEqual(2);
  });

  it("summarises the week for someone who switched the digest on, and queues the email", async () => {
    const row = await onlyNotification(subscriber.id, subscriberDossierId, "weekly_digest");

    expect(row.email_status).toBe("pending");
    expect(row.payload).toEqual({ percentage: 50, completedThisWeek: 1, remaining: 1 });
  });

  it("queues no email for a subscriber who wants the digest in the app only", async () => {
    const row = await onlyNotification(inAppOnly.id, inAppOnlyDossierId, "weekly_digest");

    expect(row.email_status).toBe("not_applicable");
  });

  it("writes nothing for someone who never switched the digest on", async () => {
    expect(await notificationsOf(silent.id, silentDossierId, "weekly_digest")).toEqual([]);
  });

  // A dossier in preparation has no bereavement to report on, and its trusted contact must see
  // nothing at all before activation.
  it("writes nothing about a dossier still in preparation", async () => {
    expect(await notificationsOf(preparing.id, preparingDossierId, "weekly_digest")).toEqual([]);
  });
});

describe("weekly-digest runs twice", () => {
  let subscriber: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    const procedure = must((await fetchProcedures(1))[0], "a catalog procedure");
    subscriber = await createTestUser("Sacha");
    dossierId = (await dossierWithOneProcedure(subscriber, procedure)).dossierId;
    await new NotificationPreferenceRepository(subscriber.client).setPreference(
      subscriber.id,
      "weekly_digest",
      true,
      true,
    );
  });

  /**
   * A digest covers a week, so a week is how often a recipient may get one. The job carries no
   * marker of the digest it already produced: a scheduler that fires twice, a manual re-run or
   * a retried pg_net invocation each add another row with email_status 'pending', and
   * send-pending-emails then sends the same summary twice.
   */
  it("summarises the week once, whatever the number of invocations", async () => {
    await runJob("weekly-digest");
    await runJob("weekly-digest");

    expect(await notificationsOf(subscriber.id, dossierId, "weekly_digest")).toHaveLength(1);
  });
});

describe("send-pending-emails", () => {
  let recipient: TestUser;
  let dossierId: string;

  /**
   * The job takes the fifty oldest pending rows, so a backlog left by an earlier suite could
   * push the row under test out of the batch and make a passing assertion mean nothing. Drained
   * first, a single run has to pick up what these tests seed.
   */
  const drainQueue = async (): Promise<void> => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (counted(await runJob("send-pending-emails"), "processed") === 0) return;
    }
    throw new Error("the pending email queue never drained");
  };

  beforeAll(async () => {
    const procedure = must((await fetchProcedures(1))[0], "a catalog procedure");
    recipient = await createTestUser("Renée");
    dossierId = (await dossierWithOneProcedure(recipient, procedure)).dossierId;
    await drainQueue();
  });

  /**
   * Without RESEND_API_KEY the send reports skipped_no_key, which is not a failure: the row
   * leaves the queue and records when it was attempted. That transition, not a message, is what
   * proves the job selected the notification and acted on it.
   */
  it("takes a pending notification out of the queue and records the attempt", async () => {
    const id = await seedNotification({
      userId: recipient.id,
      dossierId,
      type: "mention",
      emailStatus: "pending",
    });

    const result = await runJob("send-pending-emails");
    expect(counted(result, "processed")).toBe(1);
    expect(counted(result, "skipped")).toBe(1);
    expect(counted(result, "failed")).toBe(0);

    const row = await readNotification(id);
    expect(row.email_status).toBe("skipped");
    expect(row.email_last_attempt_at).not.toBeNull();
  });

  it("does not attempt the same notification a second time", async () => {
    const id = await seedNotification({
      userId: recipient.id,
      dossierId,
      type: "mention",
      emailStatus: "pending",
    });

    await runJob("send-pending-emails");
    const afterFirst = await readNotification(id);
    const second = await runJob("send-pending-emails");
    const afterSecond = await readNotification(id);

    expect(counted(second, "processed")).toBe(0);
    expect(afterSecond.email_status).toBe(afterFirst.email_status);
    expect(afterSecond.email_last_attempt_at).toBe(afterFirst.email_last_attempt_at);
  });

  it("leaves alone a notification whose recipient wants no email for it", async () => {
    const id = await seedNotification({
      userId: recipient.id,
      dossierId,
      type: "comment_on_assigned_procedure",
      emailStatus: "not_applicable",
    });

    await runJob("send-pending-emails");

    const row = await readNotification(id);
    expect(row.email_status).toBe("not_applicable");
    expect(row.email_last_attempt_at).toBeNull();
    expect(row.email_attempts).toBe(0);
  });

  it("leaves alone a notification whose email already went out", async () => {
    const id = await seedNotification({
      userId: recipient.id,
      dossierId,
      type: "mention",
      emailStatus: "sent",
    });

    await runJob("send-pending-emails");

    const row = await readNotification(id);
    expect(row.email_status).toBe("sent");
    expect(row.email_last_attempt_at).toBeNull();
  });

  // A dead address must not be retried every five minutes forever, so the batch stops selecting
  // a notification once it has exhausted its attempts.
  it("stops selecting a notification that used up its attempts", async () => {
    const id = await seedNotification({
      userId: recipient.id,
      dossierId,
      type: "mention",
      emailStatus: "pending",
      attempts: 5,
    });

    const result = await runJob("send-pending-emails");

    expect(counted(result, "processed")).toBe(0);
    const row = await readNotification(id);
    expect(row.email_status).toBe("pending");
    expect(row.email_attempts).toBe(5);
    expect(row.email_last_attempt_at).toBeNull();
  });
});
