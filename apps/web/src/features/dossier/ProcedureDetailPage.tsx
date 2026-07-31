import { CenteredShell } from "@/layout/CenteredShell";
import { PageShell } from "@/layout/PageShell";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { TrackingStatus } from "@sorento/domain";
import { CatalogNotice } from "@/components/CatalogNotice";
import { PageLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import { CommentsTab } from "@/features/dossier/procedure-detail/CommentsTab";
import { HistoryTab } from "@/features/dossier/procedure-detail/HistoryTab";
import { LetterTab } from "@/features/dossier/procedure-detail/LetterTab";
import { ProcedureTab } from "@/features/dossier/procedure-detail/ProcedureTab";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useDossier } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <CenteredShell>
        <Alert variant="destructive">
          <AlertIndicator />
          <AlertDescription>{dossierContent.procedureDetail.notFound}</AlertDescription>
        </Alert>
      </CenteredShell>
    );
  }

  return (
    <PageShell backTo={`/dossiers/${dossierId}`} title={procedure.title}>
      {/* Uncontrolled tabs open on nothing without this: the panel is chosen by value, not by order. */}
      <Tabs defaultValue="procedure">
        <TabsList aria-label={dossierContent.procedureDetail.tabsLabel}>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="procedure">
          <ProcedureTab
            procedure={procedure}
            tracking={tracking}
            access={access}
            statusMutation={statusMutation}
            assigneeMutation={assigneeMutation}
          />
        </TabsContent>

        <TabsContent value="letter">
          <LetterTab
            dossierId={dossierId}
            procedureId={procedureId}
            dossier={access.dossier}
            canGenerate={access.can("letters:generate")}
          />
        </TabsContent>

        <TabsContent value="comments">
          <CommentsTab dossierId={dossierId} procedureId={procedureId} access={access} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab dossierId={dossierId} procedureId={procedureId} access={access} />
        </TabsContent>
      </Tabs>

      <CatalogNotice
        sourceUrl={procedure.sourceUrl}
        lastVerifiedDate={procedure.lastVerifiedDate}
        referenceProfession={procedure.referenceProfession}
      />
    </PageShell>
  );
};
