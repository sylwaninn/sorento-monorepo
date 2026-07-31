import { linkVariants } from "@/components/ui/link";
import { useMemo, useState } from "react";
import { todayIso } from "@/lib/dates";
import { Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { AnswerValue, DiagnosticAnswers } from "@sorento/domain";
import { applicableQuestions, evaluateJourney } from "@sorento/core";
import { CatalogRepository } from "@sorento/supabase-client";
import { supabase } from "@/lib/supabase-client";
import { QuestionField } from "@/features/diagnostic/QuestionField";
import { questionContentFor } from "@/features/diagnostic/content";
import { adminContent } from "@/features/admin/content";
import { InlineLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { pruneInapplicableAnswers } from "@/features/diagnostic/prune-inapplicable-answers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Heading, Text } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

// mode/fullName/deathDate are bootstrap-only questions from the anonymous diagnostic;
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
  const [deathDate, setDeathDate] = useState("");

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
    setAnswers((previous) => pruneInapplicableAnswers({ ...previous, [questionId]: value }));
  };

  const result = useMemo(() => {
    if (isLoading) return null;
    return evaluateJourney({
      procedures: proceduresQuery.data ?? [],
      benefits: benefitsQuery.data ?? [],
      conditions: conditionsQuery.data ?? [],
      answers,
      deathDate: deathDate || null,
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
        <Heading level={1}>{adminContent.testing.title}</Heading>
        <RouterLink className={linkVariants()} to="/admin">
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert>
        <AlertIndicator />
        <AlertDescription>{adminContent.testing.notice}</AlertDescription>
      </Alert>

      {isLoading ? (
        <InlineLoader />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 py-4">
              <Field>
                <FieldLabel htmlFor="deathDate">{adminContent.testing.deathDateLabel}</FieldLabel>
                <Input
                  id="deathDate"
                  max={todayIso()}
                  name="deathDate"
                  onChange={(event) => setDeathDate(event.target.value)}
                  type="date"
                  value={deathDate}
                />
              </Field>

              {profileQuestions.map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  content={questionContentFor(question.id)}
                  value={answers[question.id]}
                  onChange={(value) => onAnswerChange(question.id, value)}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{adminContent.testing.resultTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Text className="font-medium">{adminContent.testing.proceduresTitle}</Text>
                {result && result.procedures.length > 0 ? (
                  result.procedures.map((procedure) => (
                    <div key={procedure.id} className="flex items-center justify-between text-sm">
                      <span>{procedure.title}</span>
                      <Text tone="muted">
                        {adminContent.timeWindowLabels[procedure.timeWindow]}
                      </Text>
                    </div>
                  ))
                ) : (
                  <Text tone="muted" size="sm">
                    {adminContent.testing.noProcedures}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <Text className="font-medium">{adminContent.testing.benefitsTitle}</Text>
                {result && result.benefits.length > 0 ? (
                  result.benefits.map((benefit) => (
                    <div key={benefit.id} className="flex items-center justify-between text-sm">
                      <span>{benefit.title}</span>
                      <Text tone="muted">{adminContent.timeWindowLabels[benefit.timeWindow]}</Text>
                    </div>
                  ))
                ) : (
                  <Text tone="muted" size="sm">
                    {adminContent.testing.noBenefits}
                  </Text>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
