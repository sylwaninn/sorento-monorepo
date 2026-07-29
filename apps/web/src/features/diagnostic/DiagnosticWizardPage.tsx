import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, ProgressBar } from "@heroui/react";
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
        <Card.Header className="flex flex-col gap-3">
          <ProgressBar
            value={answered}
            minValue={0}
            maxValue={Math.max(total, 1)}
            aria-label="Progression du diagnostic"
          />
          {/*
            Level 1: this is the page's own title, and the heading list has to start somewhere.
            Card.Title alone renders an h3, so the only screen a visitor meets before signing up
            announced itself at level three, under nothing.
          */}
          <Card.Title render={(props) => <h1 {...props} />}>
            {diagnosticContent.page.title}
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <QuestionField
            question={question}
            content={questionContent}
            value={answerValue}
            onChange={setAnswer}
          />
        </Card.Content>
        <Card.Footer className="flex justify-between gap-3">
          <Button variant="ghost" isDisabled={history.length === 0} onPress={goBack}>
            {diagnosticContent.page.backButton}
          </Button>
          <Button variant="primary" isDisabled={answerValue === undefined} onPress={goNext}>
            {diagnosticContent.page.nextButton}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
};
