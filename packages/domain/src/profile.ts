import { z } from "zod";
import { dateTimeSchema, idSchema } from "#domain/primitives";

export const profileSchema = z.object({
  id: idSchema,
  firstName: z.string().min(1),
  role: z.enum(["user", "admin"]),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Profile = z.infer<typeof profileSchema>;

export const profileUpdateSchema = profileSchema.pick({ firstName: true }).partial();
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
