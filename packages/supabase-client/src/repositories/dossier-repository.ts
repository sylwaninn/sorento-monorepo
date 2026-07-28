import type { Dossier, DossierCreation, DossierInfoUpdate, DossierPort } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, requireRow } from "#client/errors";
import { mapDossierRow } from "#client/mappers";

export class DossierRepository implements DossierPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  // Through create_dossier() rather than a plain insert: the RPC creates the row and its
  // owner membership in one transaction, which is what lets the SELECT policy require a
  // membership instead of permanently trusting created_by.
  create = async (input: DossierCreation): Promise<Dossier> => {
    const { data, error } = await this.client.rpc("create_dossier", {
      p_subject_first_name: input.subjectFirstName,
      p_subject_last_name: input.subjectLastName,
      p_status: input.status,
    });

    return mapDossierRow(requireRow(data, error, "create dossier"));
  };

  getById = async (id: string): Promise<Dossier | null> => {
    const { data, error } = await this.client.from("dossiers").select().eq("id", id).maybeSingle();

    assertNoError(error, "read dossier");
    return data ? mapDossierRow(data) : null;
  };

  listForCurrentUser = async (): Promise<Dossier[]> => {
    const { data, error } = await this.client
      .from("dossiers")
      .select()
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    assertNoError(error, "list dossiers");
    return (data ?? []).map(mapDossierRow);
  };

  updateInfo = async (id: string, input: DossierInfoUpdate): Promise<Dossier> => {
    const { data, error } = await this.client
      .from("dossiers")
      .update({
        ...(input.subjectFirstName !== undefined && { subject_first_name: input.subjectFirstName }),
        ...(input.subjectLastName !== undefined && { subject_last_name: input.subjectLastName }),
        ...(input.deathDate !== undefined && { death_date: input.deathDate }),
      })
      .eq("id", id)
      .select()
      .single();

    return mapDossierRow(requireRow(data, error, "update dossier"));
  };

  activate = async (id: string, deathDate: string): Promise<Dossier> => {
    const { data, error } = await this.client.rpc("activate_dossier", {
      p_dossier_id: id,
      p_death_date: deathDate,
    });

    return mapDossierRow(requireRow(data, error, "activate dossier"));
  };

  // Through an RPC, like creation: putting a dossier in the bin is the one write whose own
  // result revokes the writer's access, which no UPDATE policy can express cleanly.
  softDelete = async (id: string): Promise<void> => {
    const { error } = await this.client.rpc("soft_delete_dossier", { p_dossier_id: id });
    assertNoError(error, "delete dossier");
  };

  restore = async (id: string): Promise<void> => {
    const { error } = await this.client.rpc("restore_dossier", { p_dossier_id: id });
    assertNoError(error, "restore dossier");
  };
}
