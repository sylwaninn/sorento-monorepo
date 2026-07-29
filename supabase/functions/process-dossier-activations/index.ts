import { z } from "zod";
import { isAuthorizedCronRequest } from "@shared/cron-auth.ts";
import { internalError, json, preflight } from "@shared/http.ts";
import { serviceClient, type EdgeSupabaseClient } from "@shared/supabase.ts";

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

// The client is untyped, so the rows are validated instead of asserted.
const dueDossierSchema = z.object({
  id: z.string(),
  subject_first_name: z.string(),
  subject_last_name: z.string(),
  pending_activation_death_date: z.string().nullable(),
});
type DueDossier = z.infer<typeof dueDossierSchema>;

const activate = async (client: EdgeSupabaseClient, dossier: DueDossier): Promise<boolean> => {
  const { data: activated, error } = await client
    .from("dossiers")
    .update({
      status: "ACTIVE",
      death_date: dossier.pending_activation_death_date,
    })
    .eq("id", dossier.id)
    .eq("status", "PREPARATION")
    .is("pending_activation_opposed_at", null)
    .is("activation_frozen_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!activated) return false;

  const { data: members } = await client
    .from("memberships")
    .select("user_id")
    .eq("dossier_id", dossier.id);
  const recipients = members ?? [];

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
    }),
  );
  return true;
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

    const dossiers = z.array(dueDossierSchema).parse(due ?? []);
    let activated = 0;
    for (const dossier of dossiers) {
      if (await activate(client, dossier)) activated += 1;
    }

    return json(request, { activated }, 200);
  } catch (error) {
    return internalError(request, "process-dossier-activations", error);
  }
});
