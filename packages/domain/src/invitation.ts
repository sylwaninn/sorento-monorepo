import { z } from "zod";
import { emailSchema } from "#domain/auth";
import { invitableRoleSchema } from "#domain/membership";
import { dateTimeSchema, idSchema } from "#domain/primitives";

// token_hash is deliberately not part of this type: clients never see it, only the
// Edge Functions that generate/verify tokens touch that column.
export const invitationSchema = z.object({
  id: idSchema,
  dossierId: idSchema,
  email: emailSchema,
  role: invitableRoleSchema,
  message: z.string().nullable(),
  invitedBy: idSchema,
  expiresAt: dateTimeSchema,
  usedAt: dateTimeSchema.nullable(),
  revokedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
});
export type Invitation = z.infer<typeof invitationSchema>;

export const createInvitationInputSchema = z.object({
  dossierId: idSchema,
  email: emailSchema,
  role: invitableRoleSchema,
  message: z.string().max(500).optional(),
});
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;

export const createInvitationResultSchema = z.object({
  invitationId: idSchema,
  acceptUrl: z.string().url(),
});
export type CreateInvitationResult = z.infer<typeof createInvitationResultSchema>;

export const resolveInvitationResultSchema = z.object({
  dossierId: idSchema,
  subjectFirstName: z.string(),
  subjectLastName: z.string(),
  role: invitableRoleSchema,
  invitedByFirstName: z.string(),
});
export type ResolveInvitationResult = z.infer<typeof resolveInvitationResultSchema>;
