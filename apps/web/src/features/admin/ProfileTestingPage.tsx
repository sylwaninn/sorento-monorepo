import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, DateField, Label, Typography } from "@heroui/react";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import type { AnswerValue, DiagnosticAnswers } from "@sorento/domain";
import { applicableQuestions, evaluateJourney } from "@sorento/core";
import { CatalogRepository } from "@sorento/supabase-client";
import { supabase } from "@/lib/supabase-client";
import { QuestionField } from "@/features/diagnostic/QuestionField";
import { diagnosticContent } from "@/features/diagnostic/content";
import { adminContent } from "@/features/admin/content";
import { InlineLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";

// mode/fullName/deathDate are bootstrap-only questions from the anonymous diagnostic —
// this sandbox has its own death-date field and doesn't create an account or a dossier.
const PROFILE_QUESTION_IDS = new Set([
  "maritalStatus",
  "survivingSpouseAge",
  "employmentStatus",
  "ownsVehicle",
  "housingStatus",
  "hasMinorChildren",
]);

export const ProfileTestingPage = () => {
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [deathDate, setDeathDate] = useState<DateValue | null>(null);

  const proceduresQuery = useQuery({
    queryKey: ["catalog-procedures"],
    queryFn: () => new CatalogRepository(supabase).listProcedures(),
  });
  const benefitsQuery = useQuery({
    queryKey: ["catalog-benefits"],
    queryFn: () => new CatalogRepository(supabase).listBenefits(),
  });
  const conditionsQuery = useQuery({
    queryKey: ["catalog-conditions"],
    queryFn: () => new CatalogRepository(supabase).listConditions(),
  });

  const isLoading =
    proceduresQuery.isPending || benefitsQuery.isPending || conditionsQuery.isPending;

  const profileQuestions = applicableQuestions(answers).filter((question) =>
    PROFILE_QUESTION_IDS.has(question.id),
  );

  const onAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
  };

  const result = useMemo(() => {
    if (isLoading) return null;
    return evaluateJourney({
      procedures: proceduresQuery.data ?? [],
      benefits: benefitsQuery.data ?? [],
      conditions: conditionsQuery.data ?? [],
      answers,
      deathDate: deathDate ? deathDate.toString() : null,
    });
  }, [
    isLoading,
    proceduresQuery.data,
    benefitsQuery.data,
    conditionsQuery.data,
    answers,
    deathDate,
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{adminContent.testing.title}</Typography.Heading>
        <RouterLink className="link text-sm" to="/admin">
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{adminContent.testing.notice}</Alert.Description>
        </Alert.Content>
      </Alert>

      {isLoading ? (
        <InlineLoader />
      ) : (
        <>
          <Card>
            <Card.Content className="flex flex-col gap-4 py-4">
              <DateField
                maxValue={today(getLocalTimeZone())}
                value={deathDate}
                onChange={(v) => setDeathDate(v ?? null)}
              >
                <Label>{adminContent.testing.deathDateLabel}</Label>
                <DateField.Group>
                  <DateField.Input>
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                </DateField.Group>
              </DateField>

              {profileQuestions.map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  content={
                    diagnosticContent.questions[
                      question.id as keyof typeof diagnosticContent.questions
                    ]
                  }
                  value={answers[question.id]}
                  onChange={(value) => onAnswerChange(question.id, value)}
                />
              ))}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>{adminContent.testing.resultTitle}</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Typography weight="medium">{adminContent.testing.proceduresTitle}</Typography>
                {result && result.procedures.length > 0 ? (
                  result.procedures.map((procedure) => (
                    <div key={procedure.id} className="flex items-center justify-between text-sm">
                      <span>{procedure.title}</span>
                      <Typography color="muted">
                        {adminContent.timeWindowLabels[procedure.timeWindow]}
                      </Typography>
                    </div>
                  ))
                ) : (
                  <Typography.Paragraph color="muted" size="sm">
                    {adminContent.testing.noProcedures}
                  </Typography.Paragraph>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <Typography weight="medium">{adminContent.testing.benefitsTitle}</Typography>
                {result && result.benefits.length > 0 ? (
                  result.benefits.map((benefit) => (
                    <div key={benefit.id} className="flex items-center justify-between text-sm">
                      <span>{benefit.title}</span>
                      <Typography color="muted">
                        {adminContent.timeWindowLabels[benefit.timeWindow]}
                      </Typography>
                    </div>
                  ))
                ) : (
                  <Typography.Paragraph color="muted" size="sm">
                    {adminContent.testing.noBenefits}
                  </Typography.Paragraph>
                )}
              </div>
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
};
