import { env } from "@shared/env.ts";
import { internalError, json, parseBody, preflight } from "@shared/http.ts";
import { sendEmail } from "@shared/mailer.ts";
import { inviteMemberPayloadSchema } from "@shared/schemas.ts";
import { callerClient, currentUser, serviceClient } from "@shared/supabase.ts";
import { generateToken, hashToken } from "@shared/token.ts";

const INVITATION_TTL_DAYS = 14;

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  try {
    const user = await currentUser(request);
    if (!user) return json(request, { error: "unauthorized" }, 401);

    const parsed = await parseBody(request, inviteMemberPayloadSchema);
    if (!parsed.ok) return parsed.response;
    const { dossierId, email, role, message } = parsed.value;
    const normalizedEmail = email.trim().toLowerCase();

    const { data: membership } = await callerClient(request)
      .from("memberships")
      .select("role")
      .eq("dossier_id", dossierId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership?.role !== "owner") return json(request, { error: "forbidden" }, 403);

    const service = serviceClient();

    // A second live invitation for the same seat means two valid tokens and two emails.
    const { data: pending } = await service
      .from("invitations")
      .select("id")
      .eq("dossier_id", dossierId)
      .eq("email", normalizedEmail)
      .is("used_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (pending) return json(request, { error: "invitation_already_pending" }, 409);

    const token = generateToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(
      Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: invitation, error: insertError } = await service
      .from("invitations")
      .insert({
        dossier_id: dossierId,
        email: normalizedEmail,
        role,
        message: message ?? null,
        token_hash: tokenHash,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (insertError || !invitation) return json(request, { error: "insert_failed" }, 500);

    const acceptUrl = `${env.siteUrl}/invitations/accepter?token=${token}`;

    await service.from("activity_log").insert({
      dossier_id: dossierId,
      actor_id: user.id,
      action_type: "member_invited",
      target_id: null,
      details: { email: normalizedEmail, role },
    });

    // The email carries nothing beyond the two first names the specification allows.
    const [{ data: dossier }, { data: inviterProfile }] = await Promise.all([
      service.from("dossiers").select("subject_first_name").eq("id", dossierId).single(),
      service.from("profiles").select("first_name").eq("id", user.id).single(),
    ]);

    await sendEmail(normalizedEmail, {
      subject: "Invitation à rejoindre un dossier",
      bodyHtml: `<p>${inviterProfile?.first_name ?? ""} vous invite à rejoindre le dossier de ${
        dossier?.subject_first_name ?? ""
      } sur Sorento.</p><p><a href="${acceptUrl}">Accepter l'invitation</a></p>`,
      unsubscribeType: "invitation",
    });

    return json(request, { invitationId: invitation.id, acceptUrl }, 200);
  } catch (error) {
    return internalError(request, "invite-member", error);
  }
});
