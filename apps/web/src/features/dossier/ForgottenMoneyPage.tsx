import { PageShell } from "@/layout/PageShell";
import { useParams } from "react-router";
import { useQueries } from "@tanstack/react-query";
import { CatalogNotice } from "@/components/CatalogNotice";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PageLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useDossier } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Text } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/components/ui/link";

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
    <PageShell backTo={`/dossiers/${dossierId}`} title={dossierContent.forgottenMoney.title}>
      <Alert>
        <AlertIndicator />
        <AlertDescription>{dossierContent.forgottenMoney.notice}</AlertDescription>
      </Alert>

      <ErrorAlert message={addToTracking.errorMessage} />

      {blocks.map(({ procedure, entry }) => (
        <div key={procedure.id} className="flex flex-col gap-2">
          <Card>
            <CardHeader>
              <CardTitle>{procedure.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p>{procedure.description}</p>
              <Link href={procedure.sourceUrl} target="_blank" rel="noreferrer noopener">
                {dossierContent.forgottenMoney.officialLink}
              </Link>
              <Alert>
                <AlertIndicator />
                <AlertDescription>{dossierContent.forgottenMoney.blockNotice}</AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              {entry ? (
                <Badge variant="secondary">{dossierContent.statusLabels[entry.status]}</Badge>
              ) : (
                <Button
                  variant="default"
                  disabled={!access.can("tracking:update")}
                  pending={addToTracking.isPending && addToTracking.variables === procedure.id}
                  onClick={() => addToTracking.mutate(procedure.id)}
                >
                  {dossierContent.forgottenMoney.addButton}
                </Button>
              )}
            </CardFooter>
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
        <CardHeader>
          <CardTitle>{dossierContent.forgottenMoney.contractsTitle}</CardTitle>
          <CardDescription>{dossierContent.forgottenMoney.contractsIntro}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {contracts.length === 0 ? (
            <Text tone="muted" size="sm">
              {dossierContent.forgottenMoney.contractsEmpty}
            </Text>
          ) : (
            contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between gap-3 border-b pb-2 text-sm"
              >
                <span>
                  {contract.contractType} · {contract.company}
                </span>
                <Text tone="muted">{contract.contractNumber ?? ""}</Text>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
};
