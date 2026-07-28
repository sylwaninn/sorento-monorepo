import type { DocumentPort } from "@sorento/domain";
import { ALLOWED_MIME_TYPES, MAX_SIZE_BYTES, type Document } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, requireRow, SupabaseRepositoryError } from "#client/errors";
import { mapDocumentRow } from "#client/mappers";

export class DocumentRepository implements DocumentPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listForDossier = async (dossierId: string): Promise<Document[]> => {
    const { data, error } = await this.client
      .from("documents")
      .select()
      .eq("dossier_id", dossierId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    assertNoError(error, "list documents");
    return (data ?? []).map(mapDocumentRow);
  };

  upload = async (
    dossierId: string,
    category: string,
    file: File,
    addedBy: string,
  ): Promise<Document> => {
    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new SupabaseRepositoryError(`Unsupported file type: ${file.type}`, null);
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new SupabaseRepositoryError(`File too large: ${file.size} bytes`, null);
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
    const storagePath = `${dossierId}/${category}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await this.client.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType: file.type,
      });
    assertNoError(uploadError, "upload document to storage");

    const { data, error } = await this.client
      .from("documents")
      .insert({
        dossier_id: dossierId,
        category,
        storage_path: storagePath,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        added_by: addedBy,
      })
      .select()
      .single();

    return mapDocumentRow(requireRow(data, error, "create document row"));
  };

  getSignedUrl = async (storagePath: string, expiresInSeconds = 60): Promise<string> => {
    const { data, error } = await this.client.storage
      .from("documents")
      .createSignedUrl(storagePath, expiresInSeconds);
    assertNoError(error, "create signed document URL");
    if (!data) {
      throw new SupabaseRepositoryError("create signed document URL: no data returned", null);
    }
    return data.signedUrl;
  };

  softDelete = async (id: string): Promise<void> => {
    const { error } = await this.client
      .from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    assertNoError(error, "delete document");
  };
}
