import { describe, expect, it } from "vitest";
import { MAX_SIZE_BYTES } from "@sorento/domain";
import { mapDocumentRow } from "#client/mappers/document";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

const row: DocumentRow = {
  id: uuid(1),
  dossier_id: uuid(2),
  category: "acte-de-deces",
  storage_path: `${uuid(2)}/acte-de-deces/${uuid(3)}.pdf`,
  original_name: "acte.pdf",
  mime_type: "application/pdf",
  size_bytes: 2048,
  added_by: uuid(4),
  created_at: timestamp(1),
  deleted_at: null,
  updated_at: timestamp(2),
};

describe("mapDocumentRow", () => {
  it("maps every column to its own field", () => {
    expect(mapDocumentRow(row)).toEqual({
      id: uuid(1),
      dossierId: uuid(2),
      category: "acte-de-deces",
      storagePath: `${uuid(2)}/acte-de-deces/${uuid(3)}.pdf`,
      originalName: "acte.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      addedBy: uuid(4),
      createdAt: timestamp(1),
      deletedAt: null,
    });
  });

  it("accepts the three upload types the bucket allows", () => {
    for (const mimeType of ["application/pdf", "image/jpeg", "image/png"]) {
      expect(mapDocumentRow({ ...row, mime_type: mimeType }).mimeType).toBe(mimeType);
    }
  });

  // The bucket is private and the policies assume these types; anything else in the column
  // means the constraint was bypassed, which the reader must not paper over.
  it("rejects a type the bucket does not allow", () => {
    expect(() => mapDocumentRow({ ...row, mime_type: "application/zip" })).toThrow();
  });

  it("rejects a size beyond the upload ceiling", () => {
    expect(() => mapDocumentRow({ ...row, size_bytes: MAX_SIZE_BYTES + 1 })).toThrow();
  });

  it("carries a soft-deleted document with its deletion instant", () => {
    expect(mapDocumentRow({ ...row, deleted_at: timestamp(3) }).deletedAt).toBe(timestamp(3));
  });
});
