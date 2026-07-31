import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  DIAGNOSTIC_QUESTIONS,
  nextQuestion,
  diagnosticProgress,
  type QuestionDefinition,
} from "@sorento/core";
import type { AnswerValue, DiagnosticAnswers } from "@sorento/domain";
import { QuestionField, type QuestionContent } from "@/features/diagnostic/QuestionField";
import {
  loadAnswersFromSession,
  saveAnswersToSession,
} from "@/features/diagnostic/diagnostic-session";
import { diagnosticContent } from "@/features/diagnostic/content";
import { pruneInapplicableAnswers } from "@/features/diagnostic/prune-inapplicable-answers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const QUESTION_CONTENT: Record<string, QuestionContent> = diagnosticContent.questions;
const QUESTIONS_BY_ID: Record<string, QuestionDefinition> = Object.fromEntries(
  DIAGNOSTIC_QUESTIONS.map((q) => [q.id, q]),
);

export const DiagnosticWizardPage = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<DiagnosticAnswers>(() => loadAnswersFromSession());
  const [history, setHistory] = useState<string[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(
    () => nextQuestion(loadAnswersFromSession())?.id ?? null,
  );

  useEffect(() => {
    saveAnswersToSession(answers);
  }, [answers]);

  useEffect(() => {
    if (currentQuestionId === null) {
      navigate("/diagnostic/resultat");
    }
  }, [currentQuestionId, navigate]);

  if (currentQuestionId === null) return null;

  const question = QUESTIONS_BY_ID[currentQuestionId];
  if (!question) return null;

  const questionContent = QUESTION_CONTENT[question.id];
  if (!questionContent) return null;

  const { answered, total } = diagnosticProgress(answers);
  const answerValue = answers[question.id];
  const isLastQuestion = answerValue !== undefined && nextQuestion(answers) === null;

  const setAnswer = (value: AnswerValue) => {
    setAnswers((previous) => pruneInapplicableAnswers({ ...previous, [question.id]: value }));
  };

  const goNext = () => {
    const upcoming = nextQuestion(answers);
    setHistory((previous) => [...previous, question.id]);
    setCurrentQuestionId(upcoming?.id ?? null);
  };

  const goBack = () => {
    setHistory((previous) => {
      const copy = [...previous];
      const last = copy.pop();
      if (last) setCurrentQuestionId(last);
      return copy;
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-3">
          <Progress
            aria-label="Progression du diagnostic"
            value={(answered / Math.max(total, 1)) * 100}
          />
          {/*
            Level 1: this is the page's own title, and the heading list has to start somewhere.
            A card title renders a div, so the only screen a visitor meets before signing up
            announced itself under no heading at all.
          */}
          <CardTitle asChild>
            <h1>{diagnosticContent.page.title}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuestionField
            question={question}
            content={questionContent}
            value={answerValue}
            onChange={setAnswer}
          />
        </CardContent>
        <CardFooter className="flex justify-between gap-3">
          <Button variant="ghost" disabled={history.length === 0} onClick={goBack}>
            {diagnosticContent.page.backButton}
          </Button>
          <Button variant="default" disabled={answerValue === undefined} onClick={goNext}>
            {isLastQuestion
              ? diagnosticContent.page.finishButton
              : diagnosticContent.page.nextButton}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
