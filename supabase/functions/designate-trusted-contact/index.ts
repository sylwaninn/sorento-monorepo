import { env } from "@shared/env.ts";
import { escapeHtml } from "@shared/html.ts";
import { internalError, json, parseBody, preflight } from "@shared/http.ts";
import { sendEmail } from "@shared/mailer.ts";
import { designateTrustedContactPayloadSchema } from "@shared/schemas.ts";
import { callerClient, currentUser, serviceClient } from "@shared/supabase.ts";
import { generateToken, hashToken } from "@shared/token.ts";

const CONSENT_TTL_HOURS = 48;

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  try {
    const user = await currentUser(request);
    if (!user) return json(request, { error: "unauthorized" }, 401);

    const parsed = await parseBody(request, designateTrustedContactPayloadSchema);
    if (!parsed.ok) return parsed.response;
    const { dossierId, futureRole } = parsed.value;
    const normalizedEmail = parsed.value.email.trim().toLowerCase();

    const { data: membership } = await callerClient(request)
      .from("memberships")
      .select("role")
      .eq("dossier_id", dossierId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership?.role !== "owner") return json(request, { error: "forbidden" }, 403);

    const service = serviceClient();

    const { data: dossier } = await service
      .from("dossiers")
      .select("status, subject_first_name, subject_last_name")
      .eq("id", dossierId)
      .single();
    if (dossier?.status !== "PREPARATION")
      return json(request, { error: "dossier_not_in_preparation" }, 409);

    const { data: currentDesignation } = await service
      .from("trusted_contact_designations")
      .select("id")
      .eq("dossier_id", dossierId)
      .is("revoked_at", null)
      .maybeSingle();
    if (currentDesignation) {
      return json(request, { error: "trusted_contact_already_designated" }, 409);
    }

    const consentToken = generateToken();
    const consentTokenHash = await hashToken(consentToken);
    const consentExpiresAt = new Date(
      Date.now() + CONSENT_TTL_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { data: designation, error: insertError } = await service
      .from("trusted_contact_designations")
      .insert({
        dossier_id: dossierId,
        email: normalizedEmail,
        future_role: futureRole,
        consent_token_hash: consentTokenHash,
        consent_expires_at: consentExpiresAt,
        invited_by: user.id,
      })
      .select("id")
      .single();
    if (insertError?.code === "23505") {
      return json(request, { error: "trusted_contact_already_designated" }, 409);
    }
    if (insertError || !designation) return json(request, { error: "insert_failed" }, 500);

    const consentUrl = `${env.siteUrl}/contact-confiance/confirmer?token=${consentToken}`;

    await sendEmail(normalizedEmail, {
      subject: "Vous avez été désigné contact de confiance",
      bodyHtml: `<p>Vous avez été désigné comme contact de confiance pour le dossier de ${escapeHtml(
        dossier.subject_first_name,
      )} ${escapeHtml(dossier.subject_last_name)} sur Sorento.</p>
       <p>Ce rôle reste inactif tant qu'il n'est pas nécessaire. Merci de confirmer que vous l'acceptez :</p>
       <p><a href="${consentUrl}">Confirmer</a></p>
       <p style="font-size:12px;color:#666">Ce lien expire dans 48 heures.</p>`,
    });

    return json(request, { designationId: designation.id, consentUrl }, 200);
  } catch (error) {
    return internalError(request, "designate-trusted-contact", error);
  }
});
