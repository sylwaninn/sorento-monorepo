import { dossierSchema, type Dossier } from "@sorento/domain";
import type { Database } from "#client/database.types";

type DossierRow = Database["public"]["Tables"]["dossiers"]["Row"];

export const mapDossierRow = (row: DossierRow): Dossier =>
  dossierSchema.parse({
    id: row.id,
    status: row.status,
    createdBy: row.created_by,
    subjectFirstName: row.subject_first_name,
    subjectLastName: row.subject_last_name,
    deathDate: row.death_date,
    pendingActivationDeathDate: row.pending_activation_death_date,
    pendingActivationEffectiveAt: row.pending_activation_effective_at,
    pendingActivationOpposedAt: row.pending_activation_opposed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
