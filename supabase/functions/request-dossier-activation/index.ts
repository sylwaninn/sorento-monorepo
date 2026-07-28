import { env } from "@shared/env.ts";
import { internalError, json, parseBody, preflight } from "@shared/http.ts";
import { sendEmail } from "@shared/mailer.ts";
import { requestActivationPayloadSchema } from "@shared/schemas.ts";
import { emailsByUserId, serviceClient } from "@shared/supabase.ts";
import { hashToken } from "@shared/token.ts";

const GRACE_PERIOD_HOURS = 48;
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  try {
    const parsed = await parseBody(request, requestActivationPayloadSchema);
    if (!parsed.ok) return parsed.response;
    const { deathDate, documentPath } = parsed.value;

    const service = serviceClient();
    const tokenHash = await hashToken(parsed.value.token);

    const { data: designation } = await service
      .from("trusted_contact_designations")
      .select("id, dossier_id, consented_by, activation_expires_at, revoked_at")
      .eq("activation_token_hash", tokenHash)
      .maybeSingle();

    if (
      !designation ||
      designation.revoked_at ||
      designation.activation_expires_at === null ||
      new Date(designation.activation_expires_at) < new Date()
    ) {
      return json(request, { error: "invalid_or_expired" }, 404);
    }

    const { data: dossier } = await service
      .from("dossiers")
      .select(
        "status, pending_activation_effective_at, activation_frozen_at, subject_first_name, subject_last_name",
      )
      .eq("id", designation.dossier_id)
      .single();

    if (!dossier || dossier.status !== "PREPARATION")
      return json(request, { error: "already_active" }, 409);
    if (dossier.activation_frozen_at) return json(request, { error: "activation_frozen" }, 409);
    if (dossier.pending_activation_effective_at) {
      return json(request, { error: "activation_already_pending" }, 409);
    }

    const requestedAt = new Date();
    const effectiveAt = new Date(requestedAt.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);

    const { error: updateError } = await service
      .from("dossiers")
      .update({
        pending_activation_death_date: deathDate,
        pending_activation_document_path: documentPath ?? null,
        pending_activation_requested_by: designation.consented_by,
        pending_activation_requested_at: requestedAt.toISOString(),
        pending_activation_effective_at: effectiveAt.toISOString(),
        pending_activation_opposed_at: null,
        pending_activation_opposed_by: null,
      })
      .eq("id", designation.dossier_id);
    if (updateError) return json(request, { error: "update_failed" }, 500);

    await service.from("activity_log").insert({
      dossier_id: designation.dossier_id,
      actor_id: designation.consented_by,
      action_type: "dossier_activated",
      target_id: null,
      details: { phase: "requested", by: "trusted_contact" },
    });

    // Every existing member is told, and told how to object, before the grace period ends.
    const { data: members } = await service
      .from("memberships")
      .select("user_id, role")
      .eq("dossier_id", designation.dossier_id);

    const recipients = (members ?? []).filter((member) => member.role !== "trusted_contact");
    const emails = await emailsByUserId(
      service,
      recipients.map((member) => member.user_id),
    );
    const opposeUrl = `${env.siteUrl}/dossiers/${designation.dossier_id}`;

    await Promise.all(
      recipients.map(async (member) => {
        await service.rpc("create_notification", {
          p_user_id: member.user_id,
          p_actor_id: SYSTEM_ACTOR_ID,
          p_dossier_id: designation.dossier_id,
          p_type: "dossier_activated",
          p_target_id: null,
          p_payload: { phase: "pending", effectiveAt: effectiveAt.toISOString() },
        });

        const email = emails.get(member.user_id);
        if (!email) return;

        await sendEmail(email, {
          subject: "Activation d'un dossier en cours",
          bodyHtml: `<p>Le contact de confiance a signalé un décès pour le dossier de ${dossier.subject_first_name} ${dossier.subject_last_name}.</p>
           <p>Sauf opposition de votre part, l'activation sera effective dans 48 heures.</p>
           <p><a href="${opposeUrl}">Voir le dossier / signaler un problème</a></p>`,
          unsubscribeType: "dossier_activated",
        });
      }),
    );

    return json(
      request,
      { dossierId: designation.dossier_id, effectiveAt: effectiveAt.toISOString() },
      200,
    );
  } catch (error) {
    return internalError(request, "request-dossier-activation", error);
  }
});
