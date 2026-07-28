import { z } from "zod";
import { emailSchema } from "#domain/auth";
import { dateTimeSchema, idSchema } from "#domain/primitives";

const futureRoleSchema = z.enum(["owner", "collaborator"]);
export type TrustedContactFutureRole = z.infer<typeof futureRoleSchema>;

// Token hashes are deliberately absent: clients never see them.
export const trustedContactDesignationSchema = z.object({
  id: idSchema,
  dossierId: idSchema,
  email: emailSchema,
  futureRole: futureRoleSchema,
  consentedAt: dateTimeSchema.nullable(),
  activationExpiresAt: dateTimeSchema.nullable(),
  revokedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
});
export type TrustedContactDesignation = z.infer<typeof trustedContactDesignationSchema>;

export const designateTrustedContactInputSchema = z.object({
  dossierId: idSchema,
  email: emailSchema,
  futureRole: futureRoleSchema,
});
export type DesignateTrustedContactInput = z.infer<typeof designateTrustedContactInputSchema>;

export const resolveTrustedContactActivationResultSchema = z.object({
  dossierId: idSchema,
  subjectFirstName: z.string(),
  subjectLastName: z.string(),
  hasPendingActivation: z.boolean(),
});
export type ResolveTrustedContactActivationResult = z.infer<
  typeof resolveTrustedContactActivationResultSchema
>;
