import type { Benefit, Condition, DiagnosticAnswers, Procedure } from "@sorento/domain";
import { evaluateCondition } from "#core/condition-evaluation";

// A target with no attached condition row is applicable to everyone. Multiple condition
// rows for the same target combine with AND.
const isApplicable = (
  targetId: string,
  key: "procedureId" | "benefitId",
  conditions: Condition[],
  answers: DiagnosticAnswers,
): boolean => {
  const linkedConditions = conditions.filter((condition) => condition[key] === targetId);
  // No early return for the empty case: `every` on an empty list is already true, which is
  // exactly "applicable to everyone".
  return linkedConditions.every((condition) => evaluateCondition(condition.expression, answers));
};

export const applicableProcedures = (
  procedures: Procedure[],
  conditions: Condition[],
  answers: DiagnosticAnswers,
): Procedure[] =>
  procedures.filter(
    (procedure) =>
      procedure.active && isApplicable(procedure.id, "procedureId", conditions, answers),
  );

export const eligibleBenefits = (
  benefits: Benefit[],
  conditions: Condition[],
  answers: DiagnosticAnswers,
): Benefit[] =>
  benefits.filter(
    (benefit) => benefit.active && isApplicable(benefit.id, "benefitId", conditions, answers),
  );
