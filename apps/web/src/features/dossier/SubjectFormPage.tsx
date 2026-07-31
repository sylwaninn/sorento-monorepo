import { PageShell } from "@/layout/PageShell";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  dossierInfoUpdateSchema,
  type AnswerValue,
  type DiagnosticAnswers,
  type DossierInfoUpdate,
} from "@sorento/domain";
import { applicableQuestions } from "@sorento/core";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";
import { QuestionField } from "@/features/diagnostic/QuestionField";
import { questionContentFor } from "@/features/diagnostic/content";
import { useDossier } from "@/hooks/use-dossier";
import { dossierContent } from "@/features/dossier/content";
import { PageLoader } from "@/components/PageLoader";
import { pruneInapplicableAnswers } from "@/features/diagnostic/prune-inapplicable-answers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Text } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

// mode/fullName/deathDate are bootstrap-only questions from the anonymous diagnostic;
// an existing dossier already has its own identity fields and death date flow.
const PROFILE_QUESTION_IDS = new Set([
  "maritalStatus",
  "survivingSpouseAge",
  "employmentStatus",
  "ownsVehicle",
  "housingStatus",
  "hasMinorChildren",
]);

export const SubjectFormPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);

  const answersQuery = useQuery({
    queryKey: ["dossier-answers", dossierId],
    queryFn: () => repositories.answers.listForDossier(dossierId),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAppMutation({
    mutationFn: async (info: DossierInfoUpdate) => {
      await repositories.dossiers.updateInfo(dossierId, info);
      await repositories.answers.save(dossierId, answers);
    },
    invalidates: [
      queryKeys.dossiers.detail(dossierId),
      queryKeys.dossiers.answers(dossierId),
      queryKeys.dossiers.activity(dossierId),
    ],
  });

  useEffect(() => {
    if (access.dossier) {
      setFirstName(access.dossier.subjectFirstName);
      setLastName(access.dossier.subjectLastName);
    }
  }, [access.dossier]);

  useEffect(() => {
    if (answersQuery.data) {
      const next: DiagnosticAnswers = {};
      for (const answer of answersQuery.data) next[answer.key] = answer.value;
      setAnswers(next);
    }
  }, [answersQuery.data]);

  if (access.isLoading || answersQuery.isPending) {
    return <PageLoader />;
  }

  const profileQuestions = applicableQuestions(answers).filter((question) =>
    PROFILE_QUESTION_IDS.has(question.id),
  );

  const onAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers((previous) => pruneInapplicableAnswers({ ...previous, [questionId]: value }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = dossierInfoUpdateSchema.safeParse({
      subjectFirstName: firstName,
      subjectLastName: lastName,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  return (
    <PageShell backTo={`/dossiers/${dossierId}`} title={dossierContent.subjectForm.title}>
      <Card>
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-4">
            <ErrorAlert message={save.errorMessage} />
            {save.isSuccess ? (
              <Alert variant="success">
                <AlertIndicator />
                <AlertDescription>{dossierContent.subjectForm.saved}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <FieldLabel htmlFor="firstName">
                {dossierContent.subjectForm.identity.firstNameLabel}
              </FieldLabel>
              <Input
                id="firstName"
                name="firstName"
                required
                disabled={!access.can("answers:update")}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                aria-invalid={Boolean(errors["subjectFirstName"])}
              />
              {errors["subjectFirstName"] ? (
                <FieldError>{errors["subjectFirstName"]}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="lastName">
                {dossierContent.subjectForm.identity.lastNameLabel}
              </FieldLabel>
              <Input
                id="lastName"
                name="lastName"
                required
                disabled={!access.can("answers:update")}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                aria-invalid={Boolean(errors["subjectLastName"])}
              />
              {errors["subjectLastName"] ? (
                <FieldError>{errors["subjectLastName"]}</FieldError>
              ) : null}
            </Field>

            <div className="flex flex-col gap-1 border-t pt-4">
              <Text className="font-medium">{dossierContent.subjectForm.profile.title}</Text>
              <Text size="sm" tone="muted">
                {dossierContent.subjectForm.profile.description}
              </Text>
            </div>

            {profileQuestions.map((question) => (
              <fieldset key={question.id} disabled={!access.can("answers:update")}>
                <QuestionField
                  question={question}
                  content={questionContentFor(question.id)}
                  value={answers[question.id]}
                  onChange={(value) => onAnswerChange(question.id, value)}
                />
              </fieldset>
            ))}
          </CardContent>
          {access.can("answers:update") ? (
            <CardFooter>
              <Button type="submit" variant="default" pending={save.isPending}>
                {dossierContent.subjectForm.saveButton}
              </Button>
            </CardFooter>
          ) : null}
        </form>
      </Card>
    </PageShell>
  );
};
