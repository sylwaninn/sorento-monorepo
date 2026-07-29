import { internalError, json, parseBody, preflight } from "@shared/http.ts";
import { acceptInvitationPayloadSchema } from "@shared/schemas.ts";
import { currentUser, serviceClient } from "@shared/supabase.ts";
import { hashToken } from "@shared/token.ts";

Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  try {
    const user = await currentUser(request);
    if (!user) return json(request, { error: "unauthorized" }, 401);

    const parsed = await parseBody(request, acceptInvitationPayloadSchema);
    if (!parsed.ok) return parsed.response;

    const service = serviceClient();
    const tokenHash = await hashToken(parsed.value.token);

    const { data: invitation } = await service
      .from("invitations")
      .select("id, dossier_id, email, role, invited_by, expires_at, used_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (
      !invitation ||
      invitation.used_at ||
      invitation.revoked_at ||
      new Date(invitation.expires_at) < new Date()
    ) {
      return json(request, { error: "invalid_or_expired" }, 404);
    }

    // The invitation is addressed to a person, not to whoever ends up holding the link: a
    // forwarded email must not let a third party into the dossier.
    if ((user.email ?? "").trim().toLowerCase() !== invitation.email.trim().toLowerCase()) {
      return json(request, { error: "email_mismatch" }, 403);
    }

    // Never overwrite an existing membership. An owner opening an invitation to their own
    // dossier would otherwise be demoted to viewer, leaving the dossier with no owner at all.
    const { data: existing } = await service
      .from("memberships")
      .select("id, role")
      .eq("dossier_id", invitation.dossier_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { error: membershipError } = await service.from("memberships").insert({
        dossier_id: invitation.dossier_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
      });
      if (membershipError) return json(request, { error: "membership_failed" }, 500);

      await service.from("activity_log").insert({
        dossier_id: invitation.dossier_id,
        actor_id: user.id,
        action_type: "member_joined",
        target_id: user.id,
        details: {},
      });
    }

    await service
      .from("invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return json(request, { dossierId: invitation.dossier_id }, 200);
  } catch (error) {
    return internalError(request, "accept-invitation", error);
  }
});
