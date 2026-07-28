import { describe, expect, it } from "vitest";
import { commentCreationSchema, commentSchema } from "#domain/comment";
import { DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  dossierId: OTHER_ID,
  procedureId: ID,
  authorId: OTHER_ID,
  content: "Un mot pour la famille.",
  mentions: [ID],
  createdAt: DATE_TIME,
  deletedAt: null,
};

describe("commentSchema", () => {
  it("accepts a complete comment", () => {
    expect(commentSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["id", "dossierId", "content", "mentions", "createdAt"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(commentSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects an empty comment", () => {
    expect(commentSchema.safeParse({ ...VALID, content: "" }).success).toBe(false);
  });

  it("accepts a comment on the dossier rather than on a procedure", () => {
    expect(commentSchema.safeParse({ ...VALID, procedureId: null }).success).toBe(true);
  });

  // The thread survives the author: account deletion nulls author_id and blanks the body.
  it("accepts a comment whose author has deleted their account", () => {
    expect(commentSchema.safeParse({ ...VALID, authorId: null }).success).toBe(true);
  });

  it("accepts a soft-deleted comment", () => {
    expect(commentSchema.safeParse({ ...VALID, deletedAt: DATE_TIME }).success).toBe(true);
  });

  it("accepts a comment mentioning nobody", () => {
    expect(commentSchema.safeParse({ ...VALID, mentions: [] }).success).toBe(true);
  });

  it("rejects a mention that is not a user id", () => {
    expect(commentSchema.safeParse({ ...VALID, mentions: [NOT_AN_ID] }).success).toBe(false);
  });

  it("rejects mentions given as a bare string instead of a list", () => {
    expect(commentSchema.safeParse({ ...VALID, mentions: ID }).success).toBe(false);
  });
});

describe("commentCreationSchema", () => {
  const CREATION = { dossierId: OTHER_ID, procedureId: ID, content: "Bonjour", mentions: [ID] };

  it("accepts a valid creation payload", () => {
    expect(commentCreationSchema.safeParse(CREATION).success).toBe(true);
  });

  it("defaults to mentioning nobody", () => {
    const { mentions: _removed, ...withoutMentions } = CREATION;
    const result = commentCreationSchema.safeParse(withoutMentions);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mentions).toEqual([]);
    }
  });

  it("rejects an empty comment", () => {
    expect(commentCreationSchema.safeParse({ ...CREATION, content: "" }).success).toBe(false);
  });

  it("accepts a comment exactly at the 5000-character limit", () => {
    expect(
      commentCreationSchema.safeParse({ ...CREATION, content: "x".repeat(5000) }).success,
    ).toBe(true);
  });

  it("rejects a comment one character over the limit", () => {
    expect(
      commentCreationSchema.safeParse({ ...CREATION, content: "x".repeat(5001) }).success,
    ).toBe(false);
  });

  it("requires a dossier: a comment never floats free", () => {
    const { dossierId: _removed, ...withoutDossier } = CREATION;
    expect(commentCreationSchema.safeParse(withoutDossier).success).toBe(false);
  });
});
