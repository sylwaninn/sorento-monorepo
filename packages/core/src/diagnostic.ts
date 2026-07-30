import type { ConditionExpression, DiagnosticAnswers } from "@sorento/domain";
import { evaluateCondition } from "#core/condition-evaluation";

export type QuestionType =
  "single_choice" | "multiple_choice" | "text" | "date" | "number" | "boolean";

export interface QuestionDefinition {
  id: string;
  type: QuestionType;
  options?: string[];
  /** Absent = always applicable. Otherwise evaluated against the answers given so far. */
  condition?: ConditionExpression;
}

// Canonical diagnostic order. The (French) label of each question and its options lives
// in apps/web/src/features/diagnostic/content.ts; this module only knows structure and
// branches, which is what lets the order be tested without rendering anything.
export const DIAGNOSTIC_QUESTIONS: QuestionDefinition[] = [
  { id: "mode", type: "single_choice", options: ["death", "preparation"] },
  { id: "fullName", type: "text" },
  {
    id: "deathDate",
    type: "date",
    condition: { type: "comparison", field: "mode", operator: "eq", value: "death" },
  },
  {
    id: "maritalStatus",
    type: "single_choice",
    options: ["married", "civilUnion", "cohabiting", "single", "divorced"],
  },
  {
    id: "survivingSpouseAge",
    type: "number",
    condition: {
      type: "comparison",
      field: "maritalStatus",
      operator: "in",
      value: ["married", "civilUnion"],
    },
  },
  {
    id: "employmentStatus",
    type: "single_choice",
    options: ["employee", "retired", "selfEmployed", "jobseeker", "unemployed"],
  },
  { id: "ownsVehicle", type: "boolean" },
  { id: "housingStatus", type: "single_choice", options: ["tenant", "owner", "hosted"] },
  { id: "hasMinorChildren", type: "boolean" },
];

// Ordered subset relevant to this profile, recomputed on every answer.
export const applicableQuestions = (answers: DiagnosticAnswers): QuestionDefinition[] =>
  DIAGNOSTIC_QUESTIONS.filter(
    (question) => !question.condition || evaluateCondition(question.condition, answers),
  );

export const nextQuestion = (answers: DiagnosticAnswers): QuestionDefinition | null =>
  applicableQuestions(answers).find((question) => answers[question.id] === undefined) ?? null;

export const isDiagnosticComplete = (answers: DiagnosticAnswers): boolean =>
  nextQuestion(answers) === null;

export const diagnosticProgress = (
  answers: DiagnosticAnswers,
): { answered: number; total: number } => {
  const applicable = applicableQuestions(answers);
  return {
    answered: applicable.filter((question) => answers[question.id] !== undefined).length,
    total: applicable.length,
  };
};
