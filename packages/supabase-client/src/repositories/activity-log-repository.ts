import type { ActivityLogEntry, ActivityLogPort } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError } from "#client/errors";
import { mapActivityLogRow } from "#client/mappers";

/**
 * Read-mostly by design. Every event except letter generation is written by a database
 * trigger or by an Edge Function, so actor_id is always stamped server-side: the log can be
 * neither forged nor silently skipped by a client that forgets to call it.
 */
export class ActivityLogRepository implements ActivityLogPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listForDossier = async (dossierId: string, procedureId?: string): Promise<ActivityLogEntry[]> => {
    let query = this.client.from("activity_log").select().eq("dossier_id", dossierId);
    if (procedureId !== undefined) query = query.eq("target_id", procedureId);

    const { data, error } = await query.order("created_at", { ascending: false });
    assertNoError(error, "list activity log");
    return (data ?? []).map(mapActivityLogRow);
  };

  // The PDF is produced in the browser, so this event has no trigger to hang off. The RPC
  // still stamps actor_id from auth.uid() and re-checks dossier access.
  recordLetterGeneration = async (dossierId: string, procedureId: string): Promise<void> => {
    const { error } = await this.client.rpc("log_letter_generation", {
      p_dossier_id: dossierId,
      p_procedure_id: procedureId,
    });
    assertNoError(error, "record letter generation");
  };
}
