import { z } from "zod";
import { dossierStatusSchema } from "#domain/enums";
import { dateTimeSchema, dateSchema, idSchema } from "#domain/primitives";

export const dossierSchema = z.object({
  id: idSchema,
  status: dossierStatusSchema,
  createdBy: idSchema.nullable(),
  subjectFirstName: z.string().min(1),
  subjectLastName: z.string().min(1),
  deathDate: dateSchema.nullable(),
  pendingActivationDeathDate: dateSchema.nullable(),
  pendingActivationEffectiveAt: dateTimeSchema.nullable(),
  pendingActivationOpposedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  deletedAt: dateTimeSchema.nullable(),
});
export type Dossier = z.infer<typeof dossierSchema>;

export const dossierCreationSchema = z.object({
  subjectFirstName: z.string().min(1),
  subjectLastName: z.string().min(1),
  status: dossierStatusSchema.default("PREPARATION"),
});
export type DossierCreation = z.infer<typeof dossierCreationSchema>;

export const dossierInfoUpdateSchema = z.object({
  subjectFirstName: z.string().min(1).optional(),
  subjectLastName: z.string().min(1).optional(),
  deathDate: dateSchema.optional(),
});
export type DossierInfoUpdate = z.infer<typeof dossierInfoUpdateSchema>;
