import type { Comment, CommentCreation, CommentPort } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, requireRow } from "#client/errors";
import { mapCommentRow } from "#client/mappers";

export class CommentRepository implements CommentPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  // procedureId omitted => the dossier's general thread.
  listForDossier = async (dossierId: string, procedureId?: string): Promise<Comment[]> => {
    let query = this.client.from("comments").select().eq("dossier_id", dossierId);
    query =
      procedureId === undefined
        ? query.is("procedure_id", null)
        : query.eq("procedure_id", procedureId);

    const { data, error } = await query.order("created_at", { ascending: true });
    assertNoError(error, "list comments");
    return (data ?? []).map(mapCommentRow);
  };

  create = async (input: CommentCreation, authorId: string): Promise<Comment> => {
    const { data, error } = await this.client
      .from("comments")
      .insert({
        dossier_id: input.dossierId,
        procedure_id: input.procedureId,
        author_id: authorId,
        content: input.content,
        mentions: input.mentions,
      })
      .select()
      .single();

    return mapCommentRow(requireRow(data, error, "add comment"));
  };

  softDelete = async (id: string): Promise<void> => {
    const { error } = await this.client
      .from("comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    assertNoError(error, "delete comment");
  };
}
