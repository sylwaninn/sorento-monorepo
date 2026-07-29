import type { Answer, AnswerPort, DiagnosticAnswers } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError } from "#client/errors";
import { mapAnswerRow } from "#client/mappers";

export class AnswerRepository implements AnswerPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listForDossier = async (dossierId: string): Promise<Answer[]> => {
    const { data, error } = await this.client.from("answers").select().eq("dossier_id", dossierId);
    assertNoError(error, "list diagnostic answers");
    return (data ?? []).map(mapAnswerRow);
  };

  // Persists the full diagnostic answer set for a dossier (post-signup attachment flow).
  save = async (dossierId: string, answers: DiagnosticAnswers): Promise<void> => {
    const { error } = await this.client.rpc("sync_diagnostic_answers", {
      p_dossier_id: dossierId,
      p_answers: answers,
    });
    assertNoError(error, "save diagnostic answers");
  };
}
