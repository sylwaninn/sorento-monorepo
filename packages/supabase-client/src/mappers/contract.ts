import { contractSchema, type Contract } from "@sorento/domain";
import type { Database } from "#client/database.types";

type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];

export const mapContractRow = (row: ContractRow): Contract =>
  contractSchema.parse({
    id: row.id,
    dossierId: row.dossier_id,
    contractType: row.contract_type,
    company: row.company,
    contractNumber: row.contract_number,
    knownBeneficiaries: row.known_beneficiaries,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
