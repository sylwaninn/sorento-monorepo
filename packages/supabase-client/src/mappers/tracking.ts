import { trackingSchema, type Tracking } from "@sorento/domain";
import type { Database } from "#client/database.types";

type TrackingRow = Database["public"]["Tables"]["tracking"]["Row"];

export const mapTrackingRow = (row: TrackingRow): Tracking =>
  trackingSchema.parse({
    id: row.id,
    dossierId: row.dossier_id,
    procedureId: row.procedure_id,
    benefitId: row.benefit_id,
    status: row.status,
    assignedTo: row.assigned_to,
    note: row.note,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
