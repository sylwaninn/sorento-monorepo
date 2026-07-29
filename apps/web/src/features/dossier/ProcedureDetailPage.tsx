import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Tabs, Typography } from "@heroui/react";
import type { TrackingStatus } from "@sorento/domain";
import { CatalogNotice } from "@/components/CatalogNotice";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { dossierContent } from "@/features/dossier/content";
import { CommentsTab } from "@/features/dossier/procedure-detail/CommentsTab";
import { HistoryTab } from "@/features/dossier/procedure-detail/HistoryTab";
import { LetterTab } from "@/features/dossier/procedure-detail/LetterTab";
import { ProcedureTab } from "@/features/dossier/procedure-detail/ProcedureTab";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useDossier } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";

const TABS = [
  { id: "procedure", label: dossierContent.procedureDetail.tabs.procedure },
  { id: "letter", label: dossierContent.procedureDetail.tabs.letter },
  { id: "comments", label: dossierContent.procedureDetail.tabs.comments },
  { id: "history", label: dossierContent.procedureDetail.tabs.history },
] as const;

export const ProcedureDetailPage = () => {
  const { dossierId = "", procedureId = "" } = useParams();
  const access = useDossier(dossierId);

  const proceduresQuery = useQuery({
    queryKey: queryKeys.catalog.procedures(),
    queryFn: () => repositories.catalog.listProcedures(),
  });
  const trackingQuery = useQuery({
    queryKey: queryKeys.dossiers.tracking(dossierId),
    queryFn: () => repositories.tracking.listForDossier(dossierId),
  });

  const procedure = proceduresQuery.data?.find((candidate) => candidate.id === procedureId);
  const tracking = trackingQuery.data?.find((entry) => entry.procedureId === procedureId);

  // Status and assignment changes are journalled by database triggers, so the client only
  // writes the row and the audit trail cannot be forged or forgotten.
  const invalidates = [
    queryKeys.dossiers.tracking(dossierId),
    queryKeys.dossiers.activity(dossierId, procedureId),
  ];

  const statusMutation = useAppMutation<TrackingStatus, unknown>({
    mutationFn: (status) =>
      tracking
        ? repositories.tracking.update(tracking.id, { status })
        : Promise.reject(new Error("missing tracking entry")),
    invalidates,
  });

  const assigneeMutation = useAppMutation<string | null, unknown>({
    mutationFn: (assignedTo) =>
      tracking
        ? repositories.tracking.update(tracking.id, { assignedTo })
        : Promise.reject(new Error("missing tracking entry")),
    invalidates,
  });

  if (access.isLoading || proceduresQuery.isPending || trackingQuery.isPending)
    return <PageLoader />;

  if (!procedure || !tracking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{dossierContent.procedureDetail.notFound}</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{procedure.title}</Typography.Heading>
        <RouterLink className="link text-sm" to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <Tabs>
        <Tabs.ListContainer>
          <Tabs.List aria-label={dossierContent.procedureDetail.tabsLabel}>
            {TABS.map((tab) => (
              <Tabs.Tab key={tab.id} id={tab.id}>
                {tab.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="procedure">
          <ProcedureTab
            procedure={procedure}
            tracking={tracking}
            access={access}
            statusMutation={statusMutation}
            assigneeMutation={assigneeMutation}
          />
        </Tabs.Panel>

        <Tabs.Panel id="letter">
          <LetterTab
            dossierId={dossierId}
            procedureId={procedureId}
            dossier={access.dossier}
            canGenerate={access.can("letters:generate")}
          />
        </Tabs.Panel>

        <Tabs.Panel id="comments">
          <CommentsTab dossierId={dossierId} procedureId={procedureId} access={access} />
        </Tabs.Panel>

        <Tabs.Panel id="history">
          <HistoryTab dossierId={dossierId} procedureId={procedureId} access={access} />
        </Tabs.Panel>
      </Tabs>

      <CatalogNotice
        sourceUrl={procedure.sourceUrl}
        lastVerifiedDate={procedure.lastVerifiedDate}
        referenceProfession={procedure.referenceProfession}
      />
    </div>
  );
};
