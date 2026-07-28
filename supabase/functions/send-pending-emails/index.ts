import { z } from "zod";
import { env } from "@shared/env.ts";
import { isAuthorizedCronRequest } from "@shared/cron-auth.ts";
import {
  activationContent,
  digestContent,
  genericContent,
  reminderContent,
  withDossierLink,
  type ReminderItem,
} from "@shared/emails.ts";
import { internalError, json, preflight } from "@shared/http.ts";
import { sendEmail, type EmailContent } from "@shared/mailer.ts";
import { emailsByUserId, serviceClient, type EdgeSupabaseClient } from "@shared/supabase.ts";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const SETTLED_STATUSES = new Set(["done", "not_applicable"]);

const reminderItemSchema = z.object({
  trackingId: z.string(),
  title: z.string(),
});

const digestFieldsSchema = z.object({
  percentage: z.number().optional(),
  completedThisWeek: z.number().optional(),
  remaining: z.number().optional(),
});

// The client is untyped, so the rows are validated instead of asserted. A malformed payload
// falls back to null rather than wedging the whole batch behind one poisoned row.
const pendingNotificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  dossier_id: z.string().nullable(),
  type: z.string(),
  payload: digestFieldsSchema
    .extend({
      deadlines: z.array(reminderItemSchema).optional(),
      waiting: z.array(reminderItemSchema).optional(),
      emailDeadlines: z.array(reminderItemSchema).optional(),
      emailWaiting: z.array(reminderItemSchema).optional(),
      phase: z.string().optional(),
    })
    .nullable()
    .catch(null),
});

const isReminder = (type: string): boolean =>
  type === "deadline_approaching" || type === "prolonged_waiting";

/**
 * A procedure can be completed between the moment the reminder is planned and the moment it
 * is sent. The status is therefore re-read here, at send time, and the reminder is dropped
 * if nothing is left: nobody should be chased about work they already did.
 */
const stillOpen = async (
  client: EdgeSupabaseClient,
  items: readonly ReminderItem[],
): Promise<ReminderItem[]> => {
  if (items.length === 0) return [];

  const { data } = await client
    .from("tracking")
    .select("id, status")
    .in(
      "id",
      items.map((item) => item.trackingId),
    );

  const openIds = new Set(
    (data ?? []).filter((row) => !SETTLED_STATUSES.has(row.status)).map((row) => row.id),
  );
  return items.filter((item) => openIds.has(item.trackingId));
};

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;
  if (!isAuthorizedCronRequest(request)) return json(request, { error: "unauthorized" }, 401);

  try {
    const client = serviceClient();

    const { data: pending, error } = await client
      .from("notifications")
      .select("id, user_id, dossier_id, type, payload")
      .eq("email_status", "pending")
      .lt("email_attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) return json(request, { error: error.message }, 500);

    const notifications = z.array(pendingNotificationSchema).parse(pending ?? []);
    const emails = await emailsByUserId(
      client,
      notifications.map((notification) => notification.user_id),
    );

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const notification of notifications) {
      const attemptedAt = new Date().toISOString();
      const email = emails.get(notification.user_id);
      if (!email) {
        await client
          .from("notifications")
          .update({ email_status: "skipped", email_last_attempt_at: attemptedAt })
          .eq("id", notification.id);
        skipped += 1;
        continue;
      }

      let content: EmailContent;
      if (isReminder(notification.type)) {
        const [deadlines, waiting] = await Promise.all([
          stillOpen(
            client,
            notification.payload?.emailDeadlines ?? notification.payload?.deadlines ?? [],
          ),
          stillOpen(
            client,
            notification.payload?.emailWaiting ?? notification.payload?.waiting ?? [],
          ),
        ]);

        if (deadlines.length === 0 && waiting.length === 0) {
          await client
            .from("notifications")
            .update({ email_status: "skipped", email_last_attempt_at: attemptedAt })
            .eq("id", notification.id);
          skipped += 1;
          continue;
        }
        content = reminderContent(deadlines, waiting, notification.type);
      } else if (notification.type === "weekly_digest") {
        content = digestContent(notification.payload ?? {});
      } else if (notification.type === "dossier_activated") {
        content = activationContent(notification.payload?.phase);
      } else {
        content = genericContent(notification.type);
      }

      const link = notification.dossier_id
        ? `${env.siteUrl}/dossiers/${notification.dossier_id}`
        : env.siteUrl;
      const result = await sendEmail(email, withDossierLink(content, link));

      if (result === "sent") {
        await client
          .from("notifications")
          .update({ email_status: "sent", email_last_attempt_at: attemptedAt })
          .eq("id", notification.id);
        sent += 1;
        continue;
      }

      if (result === "skipped_no_key") {
        await client
          .from("notifications")
          .update({ email_status: "skipped", email_last_attempt_at: attemptedAt })
          .eq("id", notification.id);
        skipped += 1;
        continue;
      }

      // Retried on the next run, but a bounded number of times: a dead address must not be
      // retried every five minutes forever.
      const { data: current } = await client
        .from("notifications")
        .select("email_attempts")
        .eq("id", notification.id)
        .single();
      const attempts = (current?.email_attempts ?? 0) + 1;

      await client
        .from("notifications")
        .update({
          email_attempts: attempts,
          email_last_attempt_at: attemptedAt,
          email_status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        })
        .eq("id", notification.id);
      failed += 1;
    }

    return json(request, { processed: notifications.length, sent, skipped, failed }, 200);
  } catch (error) {
    return internalError(request, "send-pending-emails", error);
  }
});
