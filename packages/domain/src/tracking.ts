import { z } from "zod";
import { trackingStatusSchema } from "#domain/enums";
import { dateTimeSchema, dateSchema, idSchema } from "#domain/primitives";

export const trackingSchema = z.object({
  id: idSchema,
  dossierId: idSchema,
  procedureId: idSchema.nullable(),
  benefitId: idSchema.nullable(),
  status: trackingStatusSchema,
  assignedTo: idSchema.nullable(),
  note: z.string().nullable(),
  dueDate: dateSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Tracking = z.infer<typeof trackingSchema>;

export const trackingUpdateSchema = z.object({
  status: trackingStatusSchema.optional(),
  note: z.string().nullable().optional(),
  assignedTo: idSchema.nullable().optional(),
});
export type TrackingUpdate = z.infer<typeof trackingUpdateSchema>;
