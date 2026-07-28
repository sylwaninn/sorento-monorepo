import { isAuthorizedCronRequest } from "@shared/cron-auth.ts";
import { internalError, json, preflight } from "@shared/http.ts";
import { serviceClient, type EdgeSupabaseClient } from "@shared/supabase.ts";
import { completionPercentage } from "@sorento/core";

interface TrackingDigestRow {
  status: string;
  updated_at: string;
}

const isSettled = (entry: TrackingDigestRow): boolean =>
  entry.status === "done" || entry.status === "not_applicable";

/**
 * Monday 00:00 UTC, matching the schedule this job runs on. Everything that could fire it more
 * than once in a week looks identical from in here: a pg_net retry, a manual re-run, a scheduler
 * that ticked twice. Without a window to check against, each one sends the same digest again.
 */
const startOfWeek = (now: Date): string => {
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
};

/**
 * Opt-in only (default off in resolve_notification_preference), and a progress summary
 * rather than a nudge: it says what has advanced, never what is late.
 */
const digestFor = async (
  client: EdgeSupabaseClient,
  dossierId: string,
): Promise<{ percentage: number; completedThisWeek: number; remaining: number } | null> => {
  const { data } = await client.from("tracking").select().eq("dossier_id", dossierId);
  const entries = (data ?? []) as TrackingDigestRow[];
  if (entries.length === 0) return null;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const completedThisWeek = entries.filter(
    (entry) => isSettled(entry) && entry.updated_at >= oneWeekAgo,
  ).length;

  return {
    percentage: completionPercentage(entries, isSettled),
    completedThisWeek,
    remaining: entries.filter((entry) => !isSettled(entry)).length,
  };
};

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;
  if (!isAuthorizedCronRequest(request)) return json(request, { error: "unauthorized" }, 401);

  try {
    const client = serviceClient();
    const weekStart = startOfWeek(new Date());

    // Only people who explicitly switched the digest on, which the default never does.
    const { data: subscribers } = await client
      .from("notification_preferences")
      .select("user_id, in_app, email")
      .eq("event_type", "weekly_digest")
      .or("in_app.eq.true,email.eq.true");

    let created = 0;

    for (const subscriber of subscribers ?? []) {
      const { data: memberships } = await client
        .from("memberships")
        .select("dossier_id, dossiers!inner(status, deleted_at)")
        .eq("user_id", subscriber.user_id)
        .in("role", ["owner", "collaborator", "viewer"]);

      for (const membership of memberships ?? []) {
        const dossier = Array.isArray(membership.dossiers)
          ? membership.dossiers[0]
          : membership.dossiers;
        if (!dossier || dossier.status !== "ACTIVE" || dossier.deleted_at !== null) continue;

        // One digest per recipient per dossier per week, the same cap daily-reminders applies
        // per day. Checked before the summary is computed: a second run should cost one query,
        // not a scan of every tracking row it already summarised.
        const { data: alreadyThisWeek } = await client
          .from("notifications")
          .select("id")
          .eq("dossier_id", membership.dossier_id)
          .eq("user_id", subscriber.user_id)
          .eq("type", "weekly_digest")
          .gte("created_at", weekStart)
          .limit(1)
          .maybeSingle();
        if (alreadyThisWeek) continue;

        const summary = await digestFor(client, membership.dossier_id);
        if (summary === null) continue;

        await client.from("notifications").insert({
          user_id: subscriber.user_id,
          dossier_id: membership.dossier_id,
          type: "weekly_digest",
          target_id: null,
          payload: summary,
          email_status: subscriber.email ? "pending" : "not_applicable",
        });
        created += 1;
      }
    }

    return json(request, { created }, 200);
  } catch (error) {
    return internalError(request, "weekly-digest", error);
  }
});
