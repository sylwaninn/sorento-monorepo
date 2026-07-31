import { useQuery } from "@tanstack/react-query";
import { InlineLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import type { DossierContext } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";

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
      <CardContent className="flex flex-col gap-3 py-4">
        {entries.length === 0 ? (
          <Text tone="muted" size="sm">
            {dossierContent.procedureDetail.history.empty}
          </Text>
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
              <Text tone="muted">{new Date(entry.createdAt).toLocaleString("fr-FR")}</Text>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
