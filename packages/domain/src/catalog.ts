import { z } from "zod";
import { conditionExpressionSchema } from "#domain/condition-expression";
import { timeWindowSchema } from "#domain/enums";
import { dateTimeSchema, dateSchema, idSchema } from "#domain/primitives";

export const procedureSchema = z.object({
  id: idSchema,
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  organization: z.string().min(1),
  recipientAddress: z.string().nullable(),
  timeWindow: timeWindowSchema,
  delayDays: z.number().int().nullable(),
  referenceProfession: z.string().nullable(),
  sourceUrl: z.string().url(),
  lastVerifiedDate: dateSchema,
  active: z.boolean(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Procedure = z.infer<typeof procedureSchema>;

export const procedureInputSchema = procedureSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ProcedureInput = z.infer<typeof procedureInputSchema>;

export const benefitSchema = z.object({
  id: idSchema,
  code: z.string().min(1),
  title: z.string().min(1),
  mainCondition: z.string().min(1),
  estimatedAmount: z.string().nullable(),
  organization: z.string().min(1),
  formUrl: z.string().url(),
  cautionText: z.string().min(1),
  timeWindow: timeWindowSchema,
  sourceUrl: z.string().url(),
  lastVerifiedDate: dateSchema,
  active: z.boolean(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Benefit = z.infer<typeof benefitSchema>;

export const benefitInputSchema = benefitSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type BenefitInput = z.infer<typeof benefitInputSchema>;

export const conditionSchema = z.object({
  id: idSchema,
  procedureId: idSchema.nullable(),
  benefitId: idSchema.nullable(),
  expression: conditionExpressionSchema,
  createdAt: dateTimeSchema,
});
export type Condition = z.infer<typeof conditionSchema>;

export const conditionInputSchema = z
  .object({
    procedureId: idSchema.nullable(),
    benefitId: idSchema.nullable(),
    expression: conditionExpressionSchema,
  })
  .refine((input) => (input.procedureId !== null) !== (input.benefitId !== null), {
    message: "A condition targets exactly one of a procedure or a benefit.",
    path: ["procedureId"],
  });
export type ConditionInput = z.infer<typeof conditionInputSchema>;

export const letterTemplateSchema = z.object({
  id: idSchema,
  procedureId: idSchema,
  title: z.string().min(1),
  bodyTemplate: z.string().min(1),
  variables: z.array(z.string()),
  sourceUrl: z.string().url().nullable(),
  lastVerifiedDate: dateSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type LetterTemplate = z.infer<typeof letterTemplateSchema>;

export const letterTemplateInputSchema = letterTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type LetterTemplateInput = z.infer<typeof letterTemplateInputSchema>;
