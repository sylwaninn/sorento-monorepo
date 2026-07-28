import { z } from "zod";
import { dossierRoleSchema } from "#domain/enums";
import { dateTimeSchema, idSchema } from "#domain/primitives";

export const membershipSchema = z.object({
  id: idSchema,
  dossierId: idSchema,
  userId: idSchema,
  role: dossierRoleSchema,
  invitedBy: idSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Membership = z.infer<typeof membershipSchema>;

export const invitableRoleSchema = z.enum(["collaborator", "viewer"]);
export type InvitableRole = z.infer<typeof invitableRoleSchema>;
