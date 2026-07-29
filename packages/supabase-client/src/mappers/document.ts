import { documentSchema, type Document } from "@sorento/domain";
import type { Database } from "#client/database.types";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

export const mapDocumentRow = (row: DocumentRow): Document =>
  documentSchema.parse({
    id: row.id,
    dossierId: row.dossier_id,
    category: row.category,
    storagePath: row.storage_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    addedBy: row.added_by,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  });
