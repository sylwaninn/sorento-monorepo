import { z } from "zod";

const comparisonOperatorSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]);
export type ComparisonOperator = z.infer<typeof comparisonOperatorSchema>;

const comparisonValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);

export type ConditionExpression =
  | {
      type: "comparison";
      field: string;
      operator: ComparisonOperator;
      value: z.infer<typeof comparisonValueSchema>;
    }
  | { type: "and"; conditions: ConditionExpression[] }
  | { type: "or"; conditions: ConditionExpression[] }
  | { type: "not"; condition: ConditionExpression };

export const conditionExpressionSchema: z.ZodType<ConditionExpression> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("comparison"),
      field: z.string().min(1),
      operator: comparisonOperatorSchema,
      value: comparisonValueSchema,
    }),
    z.object({
      type: z.literal("and"),
      conditions: z.array(conditionExpressionSchema).min(1),
    }),
    z.object({
      type: z.literal("or"),
      conditions: z.array(conditionExpressionSchema).min(1),
    }),
    z.object({
      type: z.literal("not"),
      condition: conditionExpressionSchema,
    }),
  ]),
);
