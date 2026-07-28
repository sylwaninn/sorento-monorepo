import { z } from "zod";
import { activityLogTypeSchema } from "#domain/enums";
import { dateTimeSchema, idSchema } from "#domain/primitives";

export const activityLogEntrySchema = z.object({
  id: idSchema,
  dossierId: idSchema,
  actorId: idSchema.nullable(),
  actionType: activityLogTypeSchema,
  targetId: idSchema.nullable(),
  details: z.record(z.string(), z.unknown()),
  createdAt: dateTimeSchema,
});
export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>;

export const catalogHistorySchema = z.object({
  id: idSchema,
  catalogTable: z.enum(["procedures", "benefits", "conditions", "letter_templates"]),
  rowId: idSchema,
  action: z.enum(["created", "updated", "deleted"]),
  oldContent: z.record(z.string(), z.unknown()).nullable(),
  newContent: z.record(z.string(), z.unknown()).nullable(),
  // Null means a system/seed change made outside any authenticated session.
  modifiedBy: idSchema.nullable(),
  createdAt: dateTimeSchema,
});
export type CatalogHistory = z.infer<typeof catalogHistorySchema>;

export const catalogTableSchema = catalogHistorySchema.shape.catalogTable;
export type CatalogTable = z.infer<typeof catalogTableSchema>;

export const catalogHistoryActionSchema = catalogHistorySchema.shape.action;
export type CatalogHistoryAction = z.infer<typeof catalogHistoryActionSchema>;
