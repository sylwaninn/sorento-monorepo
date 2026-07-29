import { env } from "@shared/env.ts";
import { internalError, json, parseBody, preflight } from "@shared/http.ts";
import { sendEmail } from "@shared/mailer.ts";
import { consentTrustedContactPayloadSchema } from "@shared/schemas.ts";
import { currentUser, serviceClient } from "@shared/supabase.ts";
import { generateToken, hashToken } from "@shared/token.ts";

// The consent link is single-use and short-lived (48h). The activation link it produces is a
// different credential: it is the "in case of death" link, which may sit unused for years, so
// it gets a long TTL and is re-issuable. See SECURITY.md for why the two differ.
const ACTIVATION_TTL_DAYS = 365;

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  try {
    const user = await currentUser(request);
    if (!user) return json(request, { error: "unauthorized" }, 401);

    const parsed = await parseBody(request, consentTrustedContactPayloadSchema);
    if (!parsed.ok) return parsed.response;

    const service = serviceClient();
    const consentTokenHash = await hashToken(parsed.value.token);

    const { data: designation } = await service
      .from("trusted_contact_designations")
      .select("id, dossier_id, email, consented_at, consent_expires_at, revoked_at, invited_by")
      .eq("consent_token_hash", consentTokenHash)
      .maybeSingle();

    if (
      !designation ||
      designation.consented_at ||
      designation.revoked_at ||
      designation.consent_expires_at === null ||
      new Date(designation.consent_expires_at) < new Date()
    ) {
      return json(request, { error: "invalid_or_expired" }, 404);
    }

    // Same rule as invitations: the designation names a person, not a link holder.
    if ((user.email ?? "").trim().toLowerCase() !== designation.email.trim().toLowerCase()) {
      return json(request, { error: "email_mismatch" }, 403);
    }

    // Dormant membership, and never a downgrade: someone who is already a member of this
    // dossier keeps the role they have.
    const { data: existing } = await service
      .from("memberships")
      .select("id")
      .eq("dossier_id", designation.dossier_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { error: membershipError } = await service.from("memberships").insert({
        dossier_id: designation.dossier_id,
        user_id: user.id,
        role: "trusted_contact",
        invited_by: designation.invited_by,
      });
      if (membershipError) return json(request, { error: "membership_failed" }, 500);
    }

    const activationToken = generateToken();
    const activationTokenHash = await hashToken(activationToken);
    const activationExpiresAt = new Date(
      Date.now() + ACTIVATION_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // The consent token is burned here: consented_at is what makes the lookup above fail on
    // a replay.
    const { error: consentError } = await service
      .from("trusted_contact_designations")
      .update({
        consented_at: new Date().toISOString(),
        consented_by: user.id,
        consent_token_hash: null,
        activation_token_hash: activationTokenHash,
        activation_expires_at: activationExpiresAt,
      })
      .eq("id", designation.id);
    if (consentError) return json(request, { error: "consent_failed" }, 500);

    const activationUrl = `${env.siteUrl}/contact-confiance/activer?token=${activationToken}`;
    if (user.email) {
      await sendEmail(user.email, {
        subject: "Votre lien d'activation en tant que contact de confiance",
        bodyHtml: `<p>Merci d'avoir accepté ce rôle. Conservez précieusement ce lien : c'est lui qui vous
         permettra, le moment venu, de signaler le décès et d'activer le dossier.</p>
         <p><a href="${activationUrl}">${activationUrl}</a></p>`,
      });
    }

    return json(request, { dossierId: designation.dossier_id, activationUrl }, 200);
  } catch (error) {
    return internalError(request, "consent-trusted-contact", error);
  }
});
