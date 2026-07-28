import { internalError, json, parseTokenPayload, preflight } from "@shared/http.ts";
import { tokenPayloadSchema } from "@shared/schemas.ts";
import { serviceClient } from "@shared/supabase.ts";
import { hashToken } from "@shared/token.ts";

// Public: the trusted contact arrives from an email link, possibly without a session, at the
// worst moment of their life. Returns only what E10 needs to explain what is about to happen.
Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  try {
    const parsed = await parseTokenPayload(request, tokenPayloadSchema);
    if (!parsed.ok) return parsed.response;

    const service = serviceClient();
    const tokenHash = await hashToken(parsed.value.token);

    const { data: designation } = await service
      .from("trusted_contact_designations")
      .select("dossier_id, activation_expires_at, revoked_at")
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
      .select("subject_first_name, subject_last_name, status, pending_activation_effective_at")
      .eq("id", designation.dossier_id)
      .single();

    if (!dossier || dossier.status !== "PREPARATION") {
      return json(request, { error: "already_active_or_missing" }, 409);
    }

    return json(
      request,
      {
        dossierId: designation.dossier_id,
        subjectFirstName: dossier.subject_first_name,
        subjectLastName: dossier.subject_last_name,
        hasPendingActivation: Boolean(dossier.pending_activation_effective_at),
      },
      200,
    );
  } catch (error) {
    return internalError(request, "resolve-trusted-contact-activation", error);
  }
});
