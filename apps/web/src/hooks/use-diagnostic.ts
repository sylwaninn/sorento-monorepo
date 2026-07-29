import { useCallback, useEffect, useState } from "react";
import {
  applicableQuestions,
  diagnosticProgress,
  isDiagnosticComplete,
  nextQuestion,
  type QuestionDefinition,
} from "@sorento/core";
import type { AnswerValue, DiagnosticAnswers } from "@sorento/domain";
import {
  loadAnswersFromSession,
  saveAnswersToSession,
} from "@/features/diagnostic/diagnostic-session";

export interface DiagnosticState {
  answers: DiagnosticAnswers;
  question: QuestionDefinition | null;
  answered: number;
  total: number;
  canGoBack: boolean;
  isComplete: boolean;
  answer: (value: AnswerValue) => void;
  goNext: () => void;
  goBack: () => void;
}

/**
 * Wizard state, with the branching left entirely to the engine: which question comes next is
 * recomputed from the answers rather than hardcoded in the component, so a profile never sees
 * a question that does not apply to it. Progress survives a refresh because every change is
 * mirrored into the session.
 */
export const useDiagnostic = (): DiagnosticState => {
  const [answers, setAnswers] = useState<DiagnosticAnswers>(() => loadAnswersFromSession());
  const [history, setHistory] = useState<string[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(
    () => nextQuestion(loadAnswersFromSession())?.id ?? null,
  );

  useEffect(() => {
    saveAnswersToSession(answers);
  }, [answers]);

  // Looked up among the questions that still apply, so going back to an earlier question
  // works even though it already has an answer.
  const question =
    currentQuestionId === null
      ? null
      : (applicableQuestions(answers).find((candidate) => candidate.id === currentQuestionId) ??
        null);

  const answer = useCallback(
    (value: AnswerValue) => {
      if (currentQuestionId === null) return;
      setAnswers((previous) => ({ ...previous, [currentQuestionId]: value }));
    },
    [currentQuestionId],
  );

  const goNext = useCallback(() => {
    if (currentQuestionId === null) return;
    setHistory((previous) => [...previous, currentQuestionId]);
    setCurrentQuestionId(nextQuestion(answers)?.id ?? null);
  }, [answers, currentQuestionId]);

  const goBack = useCallback(() => {
    setHistory((previous) => {
      const remaining = [...previous];
      const last = remaining.pop();
      if (last !== undefined) setCurrentQuestionId(last);
      return remaining;
    });
  }, []);

  const { answered, total } = diagnosticProgress(answers);

  return {
    answers,
    question,
    answered,
    total,
    canGoBack: history.length > 0,
    isComplete: currentQuestionId === null && isDiagnosticComplete(answers),
    answer,
    goNext,
    goBack,
  };
};
