import { z } from "zod";
import { dateTimeSchema, idSchema } from "#domain/primitives";

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const documentSchema = z.object({
  id: idSchema,
  dossierId: idSchema,
  category: z.string().min(1),
  storagePath: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES),
  addedBy: idSchema.nullable(),
  createdAt: dateTimeSchema,
  deletedAt: dateTimeSchema.nullable(),
});
export type Document = z.infer<typeof documentSchema>;
