import { z } from "zod";
import { dateTimeSchema, idSchema } from "#domain/primitives";

export const contractSchema = z.object({
  id: idSchema,
  dossierId: idSchema,
  contractType: z.string().min(1),
  company: z.string().min(1),
  contractNumber: z.string().nullable(),
  knownBeneficiaries: z.string().nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Contract = z.infer<typeof contractSchema>;

export const contractInputSchema = z.object({
  contractType: z.string().min(1),
  company: z.string().min(1),
  contractNumber: z.string().nullable().optional(),
  knownBeneficiaries: z.string().nullable().optional(),
});
export type ContractInput = z.infer<typeof contractInputSchema>;
