import { describe, expect, it } from "vitest";
import { mapCommentRow } from "#client/mappers/comment";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

const row: CommentRow = {
  id: uuid(1),
  dossier_id: uuid(2),
  procedure_id: uuid(3),
  author_id: uuid(4),
  content: "J'ai appelé la banque.",
  mentions: [uuid(5), uuid(6)],
  created_at: timestamp(1),
  deleted_at: null,
  updated_at: timestamp(2),
};

describe("mapCommentRow", () => {
  it("maps every column to its own field", () => {
    expect(mapCommentRow(row)).toEqual({
      id: uuid(1),
      dossierId: uuid(2),
      procedureId: uuid(3),
      authorId: uuid(4),
      content: "J'ai appelé la banque.",
      mentions: [uuid(5), uuid(6)],
      createdAt: timestamp(1),
      deletedAt: null,
    });
  });

  // Comments are soft-deleted with a visible trace: the row keeps its content and gains a
  // deletion instant, so the mapper has to carry both rather than drop the entry.
  it("carries a soft-deleted comment with its deletion instant", () => {
    const deleted = mapCommentRow({ ...row, deleted_at: timestamp(3) });

    expect(deleted.deletedAt).toBe(timestamp(3));
    expect(deleted.content).toBe("J'ai appelé la banque.");
  });

  // The thread survives an account deletion; only the author reference goes.
  it("accepts a comment whose author deleted their account", () => {
    expect(mapCommentRow({ ...row, author_id: null }).authorId).toBeNull();
  });

  it("rejects a mention that is not a user id", () => {
    expect(() => mapCommentRow({ ...row, mentions: ["not-a-uuid"] })).toThrow();
  });
});
