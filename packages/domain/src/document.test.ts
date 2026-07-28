import { describe, expect, it } from "vitest";
import { ALLOWED_MIME_TYPES, MAX_SIZE_BYTES, documentSchema } from "#domain/document";
import { DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  dossierId: OTHER_ID,
  category: "acte_deces",
  storagePath: `${OTHER_ID}/acte_deces/${ID}.pdf`,
  originalName: "acte.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  addedBy: ID,
  createdAt: DATE_TIME,
  deletedAt: null,
};

describe("documentSchema", () => {
  it("accepts a complete document", () => {
    expect(documentSchema.safeParse(VALID).success).toBe(true);
  });

  it.each([
    "id",
    "dossierId",
    "category",
    "storagePath",
    "originalName",
    "mimeType",
    "sizeBytes",
    "createdAt",
  ])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(documentSchema.safeParse(withoutField).success).toBe(false);
  });

  it.each(["category", "storagePath", "originalName"])("rejects an empty %s", (field) => {
    expect(documentSchema.safeParse({ ...VALID, [field]: "" }).success).toBe(false);
  });

  it("rejects an id that is not a uuid", () => {
    expect(documentSchema.safeParse({ ...VALID, id: NOT_AN_ID }).success).toBe(false);
  });

  it("keeps the document once its uploader has deleted their account", () => {
    expect(documentSchema.safeParse({ ...VALID, addedBy: null }).success).toBe(true);
  });

  it("accepts a soft-deleted document", () => {
    expect(documentSchema.safeParse({ ...VALID, deletedAt: DATE_TIME }).success).toBe(true);
  });
});

describe("ALLOWED_MIME_TYPES", () => {
  // Mirrors the bucket policy and the column constraint: three formats, nothing executable.
  it("allows exactly PDF, JPEG and PNG", () => {
    expect(ALLOWED_MIME_TYPES).toEqual(["application/pdf", "image/jpeg", "image/png"]);
  });

  it.each(ALLOWED_MIME_TYPES)("accepts %s", (mimeType) => {
    expect(documentSchema.safeParse({ ...VALID, mimeType }).success).toBe(true);
  });

  it("rejects a format the bucket policy would refuse", () => {
    expect(documentSchema.safeParse({ ...VALID, mimeType: "image/svg+xml" }).success).toBe(false);
  });
});

describe("document size", () => {
  it("caps uploads at 10 MiB", () => {
    expect(MAX_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });

  it("accepts a file exactly at the cap", () => {
    expect(documentSchema.safeParse({ ...VALID, sizeBytes: MAX_SIZE_BYTES }).success).toBe(true);
  });

  it("rejects a file one byte over the cap", () => {
    expect(documentSchema.safeParse({ ...VALID, sizeBytes: MAX_SIZE_BYTES + 1 }).success).toBe(
      false,
    );
  });

  it("rejects an empty file", () => {
    expect(documentSchema.safeParse({ ...VALID, sizeBytes: 0 }).success).toBe(false);
  });

  it("rejects a negative size", () => {
    expect(documentSchema.safeParse({ ...VALID, sizeBytes: -1 }).success).toBe(false);
  });

  it("rejects a fractional byte count", () => {
    expect(documentSchema.safeParse({ ...VALID, sizeBytes: 1024.5 }).success).toBe(false);
  });
});
