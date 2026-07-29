import { useParams, Link as RouterLink } from "react-router";
import { useQueries } from "@tanstack/react-query";
import { Alert, Button, Card, Chip, Link as HeroLink, Typography } from "@heroui/react";
import { CatalogNotice } from "@/components/CatalogNotice";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { dossierContent } from "@/features/dossier/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useDossier } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";

const FORGOTTEN_MONEY_PROCEDURE_CODES = ["ciclade_search", "agira_request"] as const;

export const ForgottenMoneyPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);

  const [proceduresQuery, trackingQuery, contractsQuery] = useQueries({
    queries: [
      {
        queryKey: queryKeys.catalog.procedures(),
        queryFn: () => repositories.catalog.listProcedures(),
      },
      {
        queryKey: queryKeys.dossiers.tracking(dossierId),
        queryFn: () => repositories.tracking.listForDossier(dossierId),
      },
      {
        queryKey: queryKeys.dossiers.contracts(dossierId),
        queryFn: () => repositories.contracts.listForDossier(dossierId),
      },
    ],
  });

  const addToTracking = useAppMutation({
    mutationFn: (procedureId: string) =>
      repositories.tracking.createForProcedure(dossierId, procedureId),
    invalidates: [queryKeys.dossiers.tracking(dossierId)],
  });

  if (proceduresQuery?.isPending || trackingQuery?.isPending || contractsQuery?.isPending) {
    return <PageLoader />;
  }

  const blocks = FORGOTTEN_MONEY_PROCEDURE_CODES.flatMap((code) => {
    const procedure = proceduresQuery?.data?.find((candidate) => candidate.code === code);
    if (!procedure) return [];
    return [
      { procedure, entry: trackingQuery?.data?.find((item) => item.procedureId === procedure.id) },
    ];
  });

  const contracts = contractsQuery?.data ?? [];

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{dossierContent.forgottenMoney.title}</Typography.Heading>
        <RouterLink className="link text-sm" to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{dossierContent.forgottenMoney.notice}</Alert.Description>
        </Alert.Content>
      </Alert>

      <ErrorAlert message={addToTracking.errorMessage} />

      {blocks.map(({ procedure, entry }) => (
        <div key={procedure.id} className="flex flex-col gap-2">
          <Card>
            <Card.Header>
              <Card.Title>{procedure.title}</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-3">
              <p>{procedure.description}</p>
              <HeroLink href={procedure.sourceUrl} target="_blank" rel="noreferrer noopener">
                {dossierContent.forgottenMoney.officialLink}
              </HeroLink>
              <Alert status="default">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{dossierContent.forgottenMoney.blockNotice}</Alert.Description>
                </Alert.Content>
              </Alert>
            </Card.Content>
            <Card.Footer>
              {entry ? (
                <Chip color="default">{dossierContent.statusLabels[entry.status]}</Chip>
              ) : (
                <Button
                  variant="primary"
                  isDisabled={!access.can("tracking:update")}
                  isPending={addToTracking.isPending && addToTracking.variables === procedure.id}
                  onPress={() => addToTracking.mutate(procedure.id)}
                >
                  {dossierContent.forgottenMoney.addButton}
                </Button>
              )}
            </Card.Footer>
          </Card>
          <CatalogNotice
            sourceUrl={procedure.sourceUrl}
            lastVerifiedDate={procedure.lastVerifiedDate}
            referenceProfession={procedure.referenceProfession}
          />
        </div>
      ))}

      {/* Third block of E17: what the preparation phase inventoried, now to be checked. */}
      <Card>
        <Card.Header>
          <Card.Title>{dossierContent.forgottenMoney.contractsTitle}</Card.Title>
          <Card.Description>{dossierContent.forgottenMoney.contractsIntro}</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-2">
          {contracts.length === 0 ? (
            <Typography.Paragraph color="muted" size="sm">
              {dossierContent.forgottenMoney.contractsEmpty}
            </Typography.Paragraph>
          ) : (
            contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between gap-3 border-b pb-2 text-sm"
              >
                <span>
                  {contract.contractType} · {contract.company}
                </span>
                <Typography color="muted">{contract.contractNumber ?? ""}</Typography>
              </div>
            ))
          )}
        </Card.Content>
      </Card>
    </div>
  );
};
