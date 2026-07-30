import { linkVariants } from "@/components/ui/link";
import { useState } from "react";
import { todayIso } from "@/lib/dates";
import { useParams, Link as RouterLink } from "react-router";
import { useQueries } from "@tanstack/react-query";
import { canOpposeActivation } from "@sorento/core";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { useDossier } from "@/hooks/use-dossier";
import { dossierContent } from "@/features/dossier/content";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Heading, Text } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const PreparationDashboardPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);

  const [answersQuery, contractsQuery, documentsQuery, wishesQuery, trustedContactsQuery] =
    useQueries({
      queries: [
        {
          queryKey: queryKeys.dossiers.answers(dossierId),
          queryFn: () => repositories.answers.listForDossier(dossierId),
        },
        {
          queryKey: queryKeys.dossiers.contracts(dossierId),
          queryFn: () => repositories.contracts.listForDossier(dossierId),
        },
        {
          queryKey: queryKeys.dossiers.documents(dossierId),
          queryFn: () => repositories.documents.listForDossier(dossierId),
        },
        {
          queryKey: queryKeys.dossiers.wishes(dossierId),
          queryFn: () => repositories.preparationWishes.getForDossier(dossierId),
        },
        {
          queryKey: queryKeys.dossiers.trustedContacts(dossierId),
          queryFn: () => repositories.trustedContacts.listForDossier(dossierId),
        },
      ],
    });

  const isLoading =
    access.isLoading ||
    answersQuery?.isPending ||
    contractsQuery?.isPending ||
    documentsQuery?.isPending ||
    wishesQuery?.isPending ||
    trustedContactsQuery?.isPending;

  if (isLoading) {
    return <PageLoader />;
  }

  const wishes = wishesQuery?.data;
  const blocks = [
    {
      key: "subject" as const,
      href: `/dossiers/${dossierId}/ma-situation`,
      done: (answersQuery?.data?.length ?? 0) > 0,
    },
    {
      key: "contracts" as const,
      href: `/dossiers/${dossierId}/contrats`,
      done: (contractsQuery?.data?.length ?? 0) > 0,
    },
    {
      key: "documents" as const,
      href: `/dossiers/${dossierId}/documents`,
      done: (documentsQuery?.data?.length ?? 0) > 0,
    },
    {
      key: "wishes" as const,
      href: `/dossiers/${dossierId}/souhaits`,
      done: Boolean(wishes?.funeralWishes || wishes?.peopleToNotify || wishes?.documentLocation),
    },
    {
      key: "trustedContact" as const,
      href: `/dossiers/${dossierId}/contact-de-confiance`,
      done: (trustedContactsQuery?.data?.length ?? 0) > 0,
    },
  ];
  const doneCount = blocks.filter((block) => block.done).length;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Heading level={1}>
          {dossierContent.preparation.title} · {access.dossier?.subjectFirstName}{" "}
          {access.dossier?.subjectLastName}
        </Heading>
        <RouterLink className={linkVariants()} to="/mes-dossiers">
          {sharedContent.back}
        </RouterLink>
      </div>

      <Text tone="muted" size="sm">
        {dossierContent.preparation.intro}
      </Text>

      {access.dossier?.pendingActivationEffectiveAt ? (
        <ActivationPendingBanner
          dossierId={dossierId}
          effectiveAt={access.dossier.pendingActivationEffectiveAt}
          canOppose={canOpposeActivation(access.role)}
        />
      ) : null}

      <div className="flex flex-col gap-1">
        <Text size="sm" tone="muted">
          {dossierContent.preparation.progressLabel} · {doneCount}/{blocks.length}
        </Text>
        <Progress
          aria-label={dossierContent.preparation.progressLabel}
          value={(doneCount / blocks.length) * 100}
        />
      </div>

      <div className="flex flex-col gap-3">
        {blocks.map((block) => (
          <RouterLink key={block.key} to={block.href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex flex-col gap-1">
                  <Text className="font-medium">
                    {dossierContent.preparation.blocks[block.key].title}
                  </Text>
                  <Text size="sm" tone="muted">
                    {dossierContent.preparation.blocks[block.key].description}
                  </Text>
                </div>
                {block.done ? <span className="text-success text-sm">✓</span> : null}
              </CardContent>
            </Card>
          </RouterLink>
        ))}
      </div>

      {access.can("dossier:update") ? <DeclareDeathDialog dossierId={dossierId} /> : null}
    </div>
  );
};

const ActivationPendingBanner = ({
  dossierId,
  effectiveAt,
  canOppose,
}: {
  dossierId: string;
  effectiveAt: string;
  canOppose: boolean;
}) => {
  const oppose = useAppMutation({
    mutationFn: () => repositories.trustedContacts.opposeActivation(dossierId),
    invalidates: [queryKeys.dossiers.detail(dossierId), queryKeys.dossiers.activity(dossierId)],
  });
  const opposed = oppose.isSuccess;

  return (
    <Alert variant="warning">
      <AlertIndicator />
      <AlertDescription>
        {opposed
          ? dossierContent.activationPending.opposed
          : `${dossierContent.activationPending.description} ${new Date(effectiveAt).toLocaleString("fr-FR")}.`}
      </AlertDescription>
      <ErrorAlert message={oppose.errorMessage} />

      {canOppose && !opposed ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm">
              {dossierContent.activationPending.opposeButton}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-100">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {dossierContent.activationPending.opposeConfirmTitle}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              {dossierContent.activationPending.opposeConfirmDescription}
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => oppose.mutate(undefined)}>
                {dossierContent.activationPending.opposeConfirmButton}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </Alert>
  );
};

const DeclareDeathDialog = ({ dossierId }: { dossierId: string }) => {
  const [deathDate, setDeathDate] = useState("");

  // Irreversible: the modal states so before the action, never after.
  const declare = useAppMutation({
    mutationFn: (date: string) => repositories.dossiers.activate(dossierId, date),
    invalidates: [
      queryKeys.dossiers.detail(dossierId),
      queryKeys.dossiers.tracking(dossierId),
      queryKeys.dossiers.activity(dossierId),
    ],
  });

  const confirm = () => {
    if (deathDate) declare.mutate(deathDate);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary">{dossierContent.preparation.declareDeath.button}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-105">
        <AlertDialogHeader>
          <AlertDialogTitle>{dossierContent.preparation.declareDeath.dialogTitle}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          {dossierContent.preparation.declareDeath.dialogDescription}
        </AlertDialogDescription>
        {/* A form control is not prose: the description is a paragraph, so the field sits beside it. */}
        <Field>
          <FieldLabel htmlFor="deathDate">
            {dossierContent.preparation.declareDeath.deathDateLabel}
          </FieldLabel>
          <Input
            id="deathDate"
            max={todayIso()}
            name="deathDate"
            onChange={(event) => setDeathDate(event.target.value)}
            type="date"
            value={deathDate}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!deathDate}
            pending={declare.isPending}
            onClick={confirm}
          >
            {dossierContent.preparation.declareDeath.confirmButton}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
