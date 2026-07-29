import { useQuery } from "@tanstack/react-query";
import { Card, Typography } from "@heroui/react";
import { InlineLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import type { DossierContext } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";

export interface HistoryTabProps {
  dossierId: string;
  procedureId: string;
  access: DossierContext;
}

export const HistoryTab = ({ dossierId, procedureId, access }: HistoryTabProps) => {
  const historyQuery = useQuery({
    queryKey: queryKeys.dossiers.activity(dossierId, procedureId),
    queryFn: () => repositories.activityLog.listForDossier(dossierId, procedureId),
  });

  if (historyQuery.isPending) return <InlineLoader />;

  const entries = historyQuery.data ?? [];

  return (
    <Card>
      <Card.Content className="flex flex-col gap-3 py-4">
        {entries.length === 0 ? (
          <Typography.Paragraph color="muted" size="sm">
            {dossierContent.procedureDetail.history.empty}
          </Typography.Paragraph>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex justify-between text-sm">
              {/* actorId is null for events the system produced, such as a cron activation. */}
              <span>
                {entry.actorId === null
                  ? dossierContent.activity.systemActor
                  : access.firstNameOf(entry.actorId)}{" "}
                {dossierContent.activity.actionLabels[entry.actionType]}
              </span>
              <Typography color="muted">
                {new Date(entry.createdAt).toLocaleString("fr-FR")}
              </Typography>
            </div>
          ))
        )}
      </Card.Content>
    </Card>
  );
};
