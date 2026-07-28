import { env } from "@shared/env.ts";
import { isAuthorizedCronRequest } from "@shared/cron-auth.ts";
import { internalError, json, preflight } from "@shared/http.ts";
import { sendEmail } from "@shared/mailer.ts";
import { emailsByUserId, serviceClient, type EdgeSupabaseClient } from "@shared/supabase.ts";

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

interface DueDossier {
  id: string;
  subject_first_name: string;
  subject_last_name: string;
  pending_activation_death_date: string | null;
}

const clearedPendingFields = {
  pending_activation_death_date: null,
  pending_activation_document_path: null,
  pending_activation_requested_by: null,
  pending_activation_requested_at: null,
  pending_activation_effective_at: null,
  pending_activation_opposed_at: null,
  pending_activation_opposed_by: null,
} as const;

const promoteTrustedContact = async (
  client: EdgeSupabaseClient,
  dossierId: string,
): Promise<void> => {
  const { data: designation } = await client
    .from("trusted_contact_designations")
    .select("consented_by, future_role")
    .eq("dossier_id", dossierId)
    .not("consented_by", "is", null)
    .is("revoked_at", null)
    .maybeSingle();

  if (!designation?.consented_by) return;

  // memberships_unique_owner forbids two owner rows per dossier: free the slot first when
  // promoting to owner, otherwise the promotion below fails.
  if (designation.future_role === "owner") {
    await client
      .from("memberships")
      .update({ role: "collaborator" })
      .eq("dossier_id", dossierId)
      .eq("role", "owner");
  }

  const { error } = await client
    .from("memberships")
    .update({ role: designation.future_role })
    .eq("dossier_id", dossierId)
    .eq("user_id", designation.consented_by);
  if (error) console.error(`failed to promote trusted contact for dossier ${dossierId}:`, error);
};

const activate = async (client: EdgeSupabaseClient, dossier: DueDossier): Promise<void> => {
  await client
    .from("dossiers")
    .update({
      status: "ACTIVE",
      death_date: dossier.pending_activation_death_date,
      ...clearedPendingFields,
    })
    .eq("id", dossier.id);

  await promoteTrustedContact(client, dossier.id);

  await client.from("activity_log").insert({
    dossier_id: dossier.id,
    actor_id: null,
    action_type: "dossier_activated",
    target_id: null,
    details: { phase: "completed" },
  });

  const { data: members } = await client
    .from("memberships")
    .select("user_id")
    .eq("dossier_id", dossier.id);
  const recipients = members ?? [];
  const emails = await emailsByUserId(
    client,
    recipients.map((member) => member.user_id),
  );

  await Promise.all(
    recipients.map(async (member) => {
      await client.rpc("create_notification", {
        p_user_id: member.user_id,
        p_actor_id: SYSTEM_ACTOR_ID,
        p_dossier_id: dossier.id,
        p_type: "dossier_activated",
        p_target_id: null,
        p_payload: { phase: "completed" },
      });

      const email = emails.get(member.user_id);
      if (!email) return;
      await sendEmail(email, {
        subject: "Dossier activé",
        bodyHtml: `<p>Le dossier est maintenant actif.</p><p><a href="${env.siteUrl}/dossiers/${dossier.id}">Voir le dossier</a></p>`,
        unsubscribeType: "dossier_activated",
      });
    }),
  );
};

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;
  if (!isAuthorizedCronRequest(request)) return json(request, { error: "unauthorized" }, 401);

  try {
    const client = serviceClient();

    const { data: due } = await client
      .from("dossiers")
      .select("id, subject_first_name, subject_last_name, pending_activation_death_date")
      .eq("status", "PREPARATION")
      .not("pending_activation_effective_at", "is", null)
      .is("pending_activation_opposed_at", null)
      .is("activation_frozen_at", null)
      .lte("pending_activation_effective_at", new Date().toISOString());

    const dossiers = (due ?? []) as DueDossier[];
    for (const dossier of dossiers) {
      await activate(client, dossier);
    }

    return json(request, { activated: dossiers.length }, 200);
  } catch (error) {
    return internalError(request, "process-dossier-activations", error);
  }
});
