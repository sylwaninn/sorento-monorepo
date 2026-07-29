import { env } from "@shared/env.ts";
import { internalError, json, parseBody, preflight } from "@shared/http.ts";
import { sendEmail } from "@shared/mailer.ts";
import { opposeActivationPayloadSchema } from "@shared/schemas.ts";
import { callerClient, currentUser, emailsByUserId, serviceClient } from "@shared/supabase.ts";

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  try {
    const parsed = await parseBody(request, opposeActivationPayloadSchema);
    if (!parsed.ok) return parsed.response;
    const { dossierId, reason } = parsed.value;

    const user = await currentUser(request);
    if (!user) return json(request, { error: "unauthorized" }, 401);

    const { data: membership } = await callerClient(request)
      .from("memberships")
      .select("role")
      .eq("dossier_id", dossierId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || membership.role === "trusted_contact") {
      return json(request, { error: "forbidden" }, 403);
    }

    const service = serviceClient();

    const { data: dossier } = await service
      .from("dossiers")
      .select("pending_activation_effective_at, subject_first_name")
      .eq("id", dossierId)
      .single();
    if (!dossier?.pending_activation_effective_at) {
      return json(request, { error: "no_pending_activation" }, 409);
    }

    const opposedAt = new Date().toISOString();

    // Cancel the pending activation and freeze the dossier: a new attempt is refused until
    // support releases the freeze, so the objection actually holds.
    const { data: opposed, error: opposeError } = await service
      .from("dossiers")
      .update({
        pending_activation_death_date: null,
        pending_activation_document_path: null,
        pending_activation_requested_by: null,
        pending_activation_requested_at: null,
        pending_activation_effective_at: null,
        pending_activation_opposed_at: opposedAt,
        pending_activation_opposed_by: user.id,
        activation_frozen_at: opposedAt,
        activation_frozen_reason: reason ?? null,
      })
      .eq("id", dossierId)
      .not("pending_activation_effective_at", "is", null)
      .select("id")
      .maybeSingle();
    if (opposeError) return json(request, { error: "update_failed" }, 500);
    if (!opposed) return json(request, { error: "no_pending_activation" }, 409);

    await service.from("activity_log").insert({
      dossier_id: dossierId,
      actor_id: user.id,
      action_type: "dossier_activated",
      target_id: null,
      details: { phase: "opposed", reason: reason ?? null },
    });

    const { data: members } = await service
      .from("memberships")
      .select("user_id, role")
      .eq("dossier_id", dossierId);

    const recipients = (members ?? []).filter(
      (member) => member.role !== "trusted_contact" && member.user_id !== user.id,
    );
    const emails = await emailsByUserId(
      service,
      recipients.map((member) => member.user_id),
    );

    await Promise.all(
      recipients.map(async (member) => {
        const email = emails.get(member.user_id);
        if (!email) return;
        await sendEmail(email, {
          subject: "Activation d'un dossier suspendue",
          bodyHtml: `<p>L'activation en cours a été suspendue suite à une opposition. Notre équipe a été prévenue et vous recontactera.</p>`,
          unsubscribeType: "dossier_activated",
        });
      }),
    );

    // The email above promises the team was notified; this is what makes that true.
    if (env.supportEmail) {
      await sendEmail(env.supportEmail, {
        subject: `Opposition à une activation, dossier ${dossierId}`,
        bodyHtml: `<p>Dossier ${dossierId} (${dossier.subject_first_name}) : activation gelée suite à une opposition.</p>
         <p>Motif indiqué : ${reason ?? "non précisé"}</p>
         <p>Levée de gel : release_activation_freeze('${dossierId}') côté administration.</p>`,
      });
    } else {
      console.warn(
        `activation frozen for dossier ${dossierId} but SUPPORT_EMAIL is unset: nobody was notified`,
      );
    }

    return json(request, { opposed: true }, 200);
  } catch (error) {
    return internalError(request, "oppose-dossier-activation", error);
  }
});
