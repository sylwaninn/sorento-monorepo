import { answerSchema, type Answer } from "@sorento/domain";
import type { Database } from "#client/database.types";

type AnswerRow = Database["public"]["Tables"]["answers"]["Row"];

export const mapAnswerRow = (row: AnswerRow): Answer =>
  answerSchema.parse({
    id: row.id,
    dossierId: row.dossier_id,
    key: row.key,
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
