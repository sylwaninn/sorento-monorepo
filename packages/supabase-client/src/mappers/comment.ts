import { commentSchema, type Comment } from "@sorento/domain";
import type { Database } from "#client/database.types";

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

export const mapCommentRow = (row: CommentRow): Comment =>
  commentSchema.parse({
    id: row.id,
    dossierId: row.dossier_id,
    procedureId: row.procedure_id,
    authorId: row.author_id,
    content: row.content,
    mentions: row.mentions,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  });
