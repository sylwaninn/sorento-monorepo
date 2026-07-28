import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
  Typography,
} from "@heroui/react";
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
import { diagnosticContent } from "@/features/diagnostic/content";
import { useDossier } from "@/hooks/use-dossier";
import { dossierContent } from "@/features/dossier/content";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { pruneInapplicableAnswers } from "@/features/diagnostic/prune-inapplicable-answers";

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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{dossierContent.subjectForm.title}</Typography.Heading>
        <RouterLink className="link text-sm" to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <Card>
        <Form onSubmit={onSubmit}>
          <Card.Content className="flex flex-col gap-4">
            <ErrorAlert message={save.errorMessage} />
            {save.isSuccess ? (
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{dossierContent.subjectForm.saved}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <TextField
              isRequired
              isDisabled={!access.can("answers:update")}
              name="firstName"
              value={firstName}
              onChange={setFirstName}
              isInvalid={Boolean(errors["subjectFirstName"])}
            >
              <Label>{dossierContent.subjectForm.identity.firstNameLabel}</Label>
              <Input />
              {errors["subjectFirstName"] ? (
                <FieldError>{errors["subjectFirstName"]}</FieldError>
              ) : null}
            </TextField>

            <TextField
              isRequired
              isDisabled={!access.can("answers:update")}
              name="lastName"
              value={lastName}
              onChange={setLastName}
              isInvalid={Boolean(errors["subjectLastName"])}
            >
              <Label>{dossierContent.subjectForm.identity.lastNameLabel}</Label>
              <Input />
              {errors["subjectLastName"] ? (
                <FieldError>{errors["subjectLastName"]}</FieldError>
              ) : null}
            </TextField>

            <div className="flex flex-col gap-1 border-t pt-4">
              <Typography weight="medium">{dossierContent.subjectForm.profile.title}</Typography>
              <Typography type="body-sm" color="muted">
                {dossierContent.subjectForm.profile.description}
              </Typography>
            </div>

            {profileQuestions.map((question) => (
              <fieldset key={question.id} disabled={!access.can("answers:update")}>
                <QuestionField
                  question={question}
                  content={
                    diagnosticContent.questions[
                      question.id as keyof typeof diagnosticContent.questions
                    ]
                  }
                  value={answers[question.id]}
                  onChange={(value) => onAnswerChange(question.id, value)}
                />
              </fieldset>
            ))}
          </Card.Content>
          {access.can("answers:update") ? (
            <Card.Footer>
              <Button type="submit" variant="primary" isPending={save.isPending}>
                {dossierContent.subjectForm.saveButton}
              </Button>
            </Card.Footer>
          ) : null}
        </Form>
      </Card>
    </div>
  );
};
