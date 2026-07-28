import type { ConditionExpression, DiagnosticAnswers } from "@sorento/domain";

type Comparison = Extract<ConditionExpression, { type: "comparison" }>;

const asNumbers = (a: unknown, b: unknown): [number, number] | null =>
  typeof a === "number" && typeof b === "number" ? [a, b] : null;

const evaluateComparison = (expression: Comparison, answers: DiagnosticAnswers): boolean => {
  const answerValue = answers[expression.field];
  if (answerValue === undefined) return false;

  switch (expression.operator) {
    case "eq":
      return answerValue === expression.value;
    case "neq":
      return answerValue !== expression.value;
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const pair = asNumbers(answerValue, expression.value);
      if (pair === null) return false;
      const [a, b] = pair;
      if (expression.operator === "gt") return a > b;
      if (expression.operator === "gte") return a >= b;
      if (expression.operator === "lt") return a < b;
      return a <= b;
    }
    case "in":
      return Array.isArray(expression.value) && !Array.isArray(answerValue)
        ? expression.value.includes(String(answerValue))
        : false;
    case "contains":
      return Array.isArray(answerValue) && answerValue.includes(String(expression.value));
  }
};

// A missing field always fails the comparison — no eligibility is granted on unknown data.
export const evaluateCondition = (
  expression: ConditionExpression,
  answers: DiagnosticAnswers,
): boolean => {
  switch (expression.type) {
    case "comparison":
      return evaluateComparison(expression, answers);
    case "and":
      return expression.conditions.every((condition) => evaluateCondition(condition, answers));
    case "or":
      return expression.conditions.some((condition) => evaluateCondition(condition, answers));
    case "not":
      return !evaluateCondition(expression.condition, answers);
  }
};
