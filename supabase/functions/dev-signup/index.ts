import { z } from "zod";
import { env } from "@shared/env.ts";
import { internalError, json, parseBody, preflight } from "@shared/http.ts";
import { serviceClient } from "@shared/supabase.ts";

// Declared here rather than pulled from _shared/schemas.ts: that module imports
// @sorento/domain, and the local edge runtime only mounts supabase/functions, so any function
// reaching outside it fails to boot. Shape only: the password policy stays owned by GoTrue
// (auth.minimum_password_length), so there is no business rule duplicated here to drift.
const payloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Local-development shortcut: creates an already-confirmed account so testing signup does not
 * require opening the confirmation email. It runs under service_role, so the environment gate
 * is the entire security of this endpoint; see _shared/env.ts for the two signals it demands.
 *
 * Outside a local stack it answers 404 rather than 403: a caller on a deployed environment
 * learns nothing about the endpoint existing at all.
 */
Deno.serve(async (request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  // Checked before the body is even read: nothing about the request may influence the gate.
  if (!env.isDevelopment) {
    console.warn("dev-signup refused: not a local development environment");
    return json(request, { error: "not_found" }, 404);
  }

  try {
    const parsed = await parseBody(request, payloadSchema);
    if (!parsed.ok) return parsed.response;

    const { error } = await serviceClient().auth.admin.createUser({
      email: parsed.value.email,
      password: parsed.value.password,
      email_confirm: true,
    });
    if (error) return json(request, { error: "signup_failed", message: error.message }, 400);

    return json(request, { ok: true }, 200);
  } catch (error) {
    return internalError(request, "dev-signup", error);
  }
});
