import type { Contract, ContractInput, ContractPort } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, requireRow } from "#client/errors";
import { mapContractRow } from "#client/mappers";

export class ContractRepository implements ContractPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listForDossier = async (dossierId: string): Promise<Contract[]> => {
    const { data, error } = await this.client
      .from("contracts")
      .select()
      .eq("dossier_id", dossierId)
      .order("created_at", { ascending: false });

    assertNoError(error, "list contracts");
    return (data ?? []).map(mapContractRow);
  };

  create = async (dossierId: string, input: ContractInput): Promise<Contract> => {
    const { data, error } = await this.client
      .from("contracts")
      .insert({
        dossier_id: dossierId,
        contract_type: input.contractType,
        company: input.company,
        contract_number: input.contractNumber ?? null,
        known_beneficiaries: input.knownBeneficiaries ?? null,
      })
      .select()
      .single();

    return mapContractRow(requireRow(data, error, "create contract"));
  };

  update = async (id: string, input: ContractInput): Promise<Contract> => {
    const { data, error } = await this.client
      .from("contracts")
      .update({
        contract_type: input.contractType,
        company: input.company,
        contract_number: input.contractNumber ?? null,
        known_beneficiaries: input.knownBeneficiaries ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    return mapContractRow(requireRow(data, error, "update contract"));
  };

  delete = async (id: string): Promise<void> => {
    const { error } = await this.client.from("contracts").delete().eq("id", id);
    assertNoError(error, "delete contract");
  };
}
