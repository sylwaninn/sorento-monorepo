import { useState } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQueries } from "@tanstack/react-query";
import { canOpposeActivation } from "@sorento/core";
import {
  Alert,
  AlertDialog,
  Button,
  Card,
  DateField,
  Label,
  ProgressBar,
  Typography,
} from "@heroui/react";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { useDossier } from "@/hooks/use-dossier";
import { dossierContent } from "@/features/dossier/content";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";

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
        <Typography.Heading level={1}>
          {dossierContent.preparation.title} · {access.dossier?.subjectFirstName}{" "}
          {access.dossier?.subjectLastName}
        </Typography.Heading>
        <RouterLink className="link text-sm" to="/mes-dossiers">
          {sharedContent.back}
        </RouterLink>
      </div>

      <Typography.Paragraph color="muted" size="sm">
        {dossierContent.preparation.intro}
      </Typography.Paragraph>

      {access.dossier?.pendingActivationEffectiveAt ? (
        <ActivationPendingBanner
          dossierId={dossierId}
          effectiveAt={access.dossier.pendingActivationEffectiveAt}
          canOppose={canOpposeActivation(access.role)}
        />
      ) : null}

      <div className="flex flex-col gap-1">
        <Typography type="body-sm" color="muted">
          {dossierContent.preparation.progressLabel} · {doneCount}/{blocks.length}
        </Typography>
        <ProgressBar
          value={(doneCount / blocks.length) * 100}
          aria-label={dossierContent.preparation.progressLabel}
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>

      <div className="flex flex-col gap-3">
        {blocks.map((block) => (
          <RouterLink key={block.key} to={block.href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <Card.Content className="flex items-center justify-between gap-3 py-4">
                <div className="flex flex-col gap-1">
                  <Typography weight="medium">
                    {dossierContent.preparation.blocks[block.key].title}
                  </Typography>
                  <Typography type="body-sm" color="muted">
                    {dossierContent.preparation.blocks[block.key].description}
                  </Typography>
                </div>
                {block.done ? <span className="text-success text-sm">✓</span> : null}
              </Card.Content>
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
    <Alert status="warning">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>
          {opposed
            ? dossierContent.activationPending.opposed
            : `${dossierContent.activationPending.description} ${new Date(effectiveAt).toLocaleString("fr-FR")}.`}
        </Alert.Description>
        <ErrorAlert message={oppose.errorMessage} />

        {canOppose && !opposed ? (
          <AlertDialog>
            <Button variant="ghost" size="sm">
              {dossierContent.activationPending.opposeButton}
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[400px]">
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="warning" />
                    <AlertDialog.Heading>
                      {dossierContent.activationPending.opposeConfirmTitle}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>{dossierContent.activationPending.opposeConfirmDescription}</p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      Annuler
                    </Button>
                    <Button slot="close" variant="danger" onPress={() => oppose.mutate(undefined)}>
                      {dossierContent.activationPending.opposeConfirmButton}
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        ) : null}
      </Alert.Content>
    </Alert>
  );
};

const DeclareDeathDialog = ({ dossierId }: { dossierId: string }) => {
  const [deathDate, setDeathDate] = useState<DateValue | null>(null);

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
    if (deathDate) declare.mutate(deathDate.toString());
  };

  return (
    <AlertDialog>
      <Button variant="tertiary">{dossierContent.preparation.declareDeath.button}</Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>
                {dossierContent.preparation.declareDeath.dialogTitle}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex flex-col gap-4">
              <p>{dossierContent.preparation.declareDeath.dialogDescription}</p>
              <DateField
                maxValue={today(getLocalTimeZone())}
                value={deathDate}
                onChange={(v) => setDeathDate(v ?? null)}
              >
                <Label>{dossierContent.preparation.declareDeath.deathDateLabel}</Label>
                <DateField.Group>
                  <DateField.Input>
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                </DateField.Group>
              </DateField>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Annuler
              </Button>
              <Button
                variant="danger"
                isDisabled={!deathDate}
                isPending={declare.isPending}
                onPress={confirm}
              >
                {dossierContent.preparation.declareDeath.confirmButton}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
};
