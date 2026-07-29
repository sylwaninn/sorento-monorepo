import { internalError, json, parseTokenPayload, preflight } from "@shared/http.ts";
import { tokenPayloadSchema } from "@shared/schemas.ts";
import { serviceClient } from "@shared/supabase.ts";
import { hashToken } from "@shared/token.ts";

// Public on purpose: the invitee has no session yet. Returns only what E09 needs to show
// who is inviting them to which dossier, and nothing about its contents.
Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  try {
    const parsed = await parseTokenPayload(request, tokenPayloadSchema);
    if (!parsed.ok) return parsed.response;

    const service = serviceClient();
    const tokenHash = await hashToken(parsed.value.token);

    const { data: invitation } = await service
      .from("invitations")
      .select("dossier_id, role, invited_by, expires_at, used_at, revoked_at")
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

    const [{ data: dossier }, { data: inviter }] = await Promise.all([
      service
        .from("dossiers")
        .select("subject_first_name, subject_last_name")
        .eq("id", invitation.dossier_id)
        .single(),
      service.from("profiles").select("first_name").eq("id", invitation.invited_by).single(),
    ]);

    return json(
      request,
      {
        dossierId: invitation.dossier_id,
        subjectFirstName: dossier?.subject_first_name ?? "",
        subjectLastName: dossier?.subject_last_name ?? "",
        role: invitation.role,
        invitedByFirstName: inviter?.first_name ?? "",
      },
      200,
    );
  } catch (error) {
    return internalError(request, "resolve-invitation", error);
  }
});
