import { isAuthorizedCronRequest } from "@shared/cron-auth.ts";
import { internalError, json, preflight } from "@shared/http.ts";
import { serviceClient, type EdgeSupabaseClient } from "@shared/supabase.ts";
import {
  addDays,
  calculateDueDate,
  daysBetween,
  isCalendarDate,
  toCalendarDate,
  type CalendarDate,
} from "@sorento/core";
import { timeWindowSchema } from "@sorento/domain";

const APPROACHING_WINDOW_DAYS = 3;
const PROLONGED_WAITING_DAYS = 5;
const SETTLED_STATUSES = ["done", "not_applicable"];

interface ReminderItem {
  trackingId: string;
  title: string;
}

interface ReminderGroup {
  deadlines: ReminderItem[];
  waiting: ReminderItem[];
}

interface CatalogRow {
  title: string;
  delay_days: number | null;
  time_window: string;
}

interface TrackingRow {
  id: string;
  status: string;
  assigned_to: string | null;
  updated_at: string;
  catalog: CatalogRow | null;
}

const emptyGroup = (): ReminderGroup => ({ deadlines: [], waiting: [] });

const collectByRecipient = (
  rows: readonly TrackingRow[],
  ownerId: string | undefined,
  deathDate: CalendarDate,
  today: CalendarDate,
): Map<string, ReminderGroup> => {
  const approachingCutoff = addDays(today, APPROACHING_WINDOW_DAYS);
  const staleBefore = addDays(today, -PROLONGED_WAITING_DAYS);
  const groups = new Map<string, ReminderGroup>();

  for (const row of rows) {
    const catalog = row.catalog;
    if (!catalog) continue;

    // The assignee owns the reminder; an unassigned procedure falls back to the owner.
    const recipient = row.assigned_to ?? ownerId;
    if (!recipient) continue;

    const group = groups.get(recipient) ?? emptyGroup();
    groups.set(recipient, group);

    const dueDate = calculateDueDate(
      {
        delayDays: catalog.delay_days,
        timeWindow: timeWindowSchema.parse(catalog.time_window),
      },
      deathDate,
    );
    if (daysBetween(dueDate, approachingCutoff) >= 0) {
      group.deadlines.push({ trackingId: row.id, title: catalog.title });
    }

    if (row.status === "waiting" && toCalendarDate(new Date(row.updated_at)) <= staleBefore) {
      group.waiting.push({ trackingId: row.id, title: catalog.title });
    }
  }

  return groups;
};

interface Preference {
  p_in_app: boolean;
  p_email: boolean;
}

const resolvePreference = async (
  client: EdgeSupabaseClient,
  userId: string,
  dossierId: string,
  eventType: string,
): Promise<Preference> => {
  const { data } = await client.rpc("resolve_notification_preference", {
    p_user_id: userId,
    p_dossier_id: dossierId,
    p_event_type: eventType,
  });
  const resolved = Array.isArray(data) ? data[0] : data;
  return { p_in_app: resolved?.p_in_app ?? false, p_email: resolved?.p_email ?? false };
};

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;
  if (!isAuthorizedCronRequest(request)) return json(request, { error: "unauthorized" }, 401);

  try {
    const client = serviceClient();
    const today = toCalendarDate(new Date());
    const startOfToday = `${today}T00:00:00.000Z`;

    const { data: dossiers } = await client
      .from("dossiers")
      .select("id, death_date")
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .not("death_date", "is", null);

    let notificationsCreated = 0;
    let emailsQueued = 0;

    for (const dossier of dossiers ?? []) {
      const deathDate: string = String(dossier.death_date);
      if (!isCalendarDate(deathDate)) continue;

      const [{ data: tracking }, { data: owner }] = await Promise.all([
        client
          .from("tracking")
          .select(
            "id, status, assigned_to, updated_at, procedures(title, delay_days, time_window), benefits(title, time_window)",
          )
          .eq("dossier_id", dossier.id)
          .not("status", "in", `(${SETTLED_STATUSES.join(",")})`),
        client
          .from("memberships")
          .select("user_id")
          .eq("dossier_id", dossier.id)
          .eq("role", "owner")
          .maybeSingle(),
      ]);

      const rows = (tracking ?? []).map((row): TrackingRow => {
        const procedure = Array.isArray(row.procedures)
          ? (row.procedures[0] ?? null)
          : row.procedures;
        const benefit = Array.isArray(row.benefits) ? (row.benefits[0] ?? null) : row.benefits;
        return {
          id: row.id,
          status: row.status,
          assigned_to: row.assigned_to,
          updated_at: row.updated_at,
          catalog: procedure ?? (benefit ? { ...benefit, delay_days: null } : null),
        };
      });

      const groups = collectByRecipient(rows, owner?.user_id, deathDate, today);

      for (const [recipientId, group] of groups) {
        const [deadlinePreference, waitingPreference] = await Promise.all([
          resolvePreference(client, recipientId, dossier.id, "deadline_approaching"),
          resolvePreference(client, recipientId, dossier.id, "prolonged_waiting"),
        ]);

        const deadlines =
          deadlinePreference.p_in_app || deadlinePreference.p_email ? group.deadlines : [];
        const waiting =
          waitingPreference.p_in_app || waitingPreference.p_email ? group.waiting : [];
        const emailDeadlines = deadlinePreference.p_email ? group.deadlines : [];
        const emailWaiting = waitingPreference.p_email ? group.waiting : [];
        if (deadlines.length === 0 && waiting.length === 0) continue;

        // One row per dossier per recipient per day, carrying both lists: the anti-noise cap
        // is "one reminder email per dossier per day", not one per reminder type.
        const { data: alreadyToday } = await client
          .from("notifications")
          .select("id")
          .eq("dossier_id", dossier.id)
          .eq("user_id", recipientId)
          .in("type", ["deadline_approaching", "prolonged_waiting"])
          .gte("created_at", startOfToday)
          .maybeSingle();
        if (alreadyToday) continue;

        const wantsEmail = emailDeadlines.length > 0 || emailWaiting.length > 0;

        await client.from("notifications").insert({
          user_id: recipientId,
          dossier_id: dossier.id,
          type: deadlines.length > 0 ? "deadline_approaching" : "prolonged_waiting",
          target_id: null,
          payload: { deadlines, waiting, emailDeadlines, emailWaiting },
          email_status: wantsEmail ? "pending" : "not_applicable",
        });

        notificationsCreated += 1;
        if (wantsEmail) emailsQueued += 1;
      }
    }

    return json(request, { notificationsCreated, emailsQueued }, 200);
  } catch (error) {
    return internalError(request, "daily-reminders", error);
  }
});
