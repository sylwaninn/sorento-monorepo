import { z } from "zod";
import { dateTimeSchema, idSchema } from "#domain/primitives";

export const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);
export type AnswerValue = z.infer<typeof answerValueSchema>;

export const answerSchema = z.object({
  id: idSchema,
  dossierId: idSchema,
  key: z.string().min(1),
  value: answerValueSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Answer = z.infer<typeof answerSchema>;

/** What the engine (core) consumes: the full answer set, indexed by question key. */
export const diagnosticAnswersSchema = z.record(z.string(), answerValueSchema);
export type DiagnosticAnswers = z.infer<typeof diagnosticAnswersSchema>;
