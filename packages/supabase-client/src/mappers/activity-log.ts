import {
  activityLogEntrySchema,
  catalogHistorySchema,
  type ActivityLogEntry,
  type CatalogHistory,
} from "@sorento/domain";
import type { Database } from "#client/database.types";

type ActivityLogRow = Database["public"]["Tables"]["activity_log"]["Row"];
type CatalogHistoryRow = Database["public"]["Tables"]["catalog_history"]["Row"];

export const mapActivityLogRow = (row: ActivityLogRow): ActivityLogEntry =>
  activityLogEntrySchema.parse({
    id: row.id,
    dossierId: row.dossier_id,
    actorId: row.actor_id,
    actionType: row.action_type,
    targetId: row.target_id,
    details: row.details,
    createdAt: row.created_at,
  });

export const mapCatalogHistoryRow = (row: CatalogHistoryRow): CatalogHistory =>
  catalogHistorySchema.parse({
    id: row.id,
    catalogTable: row.catalog_table,
    rowId: row.row_id,
    action: row.action,
    oldContent: row.old_content,
    newContent: row.new_content,
    modifiedBy: row.modified_by,
    createdAt: row.created_at,
  });
