import { z } from "zod";
import { dateTimeSchema, idSchema } from "#domain/primitives";

export const commentSchema = z.object({
  id: idSchema,
  dossierId: idSchema,
  procedureId: idSchema.nullable(),
  // Null once the author has deleted their account: the thread survives, the name does not.
  authorId: idSchema.nullable(),
  content: z.string().min(1),
  mentions: z.array(idSchema),
  createdAt: dateTimeSchema,
  deletedAt: dateTimeSchema.nullable(),
});
export type Comment = z.infer<typeof commentSchema>;

export const commentCreationSchema = z.object({
  dossierId: idSchema,
  procedureId: idSchema.nullable(),
  content: z.string().min(1).max(5000),
  mentions: z.array(idSchema).default([]),
});
export type CommentCreation = z.infer<typeof commentCreationSchema>;
