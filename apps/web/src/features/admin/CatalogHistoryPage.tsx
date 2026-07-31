import { PageShell } from "@/layout/PageShell";
import { useQuery } from "@tanstack/react-query";
import { CatalogHistoryRepository } from "@sorento/supabase-client";
import type { CatalogHistoryAction } from "@sorento/domain";
import { supabase } from "@/lib/supabase-client";
import { adminContent } from "@/features/admin/content";
import { InlineLoader } from "@/components/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";

const ACTION_COLOR: Record<CatalogHistoryAction, "secondary" | "default" | "destructive"> = {
  created: "secondary",
  updated: "default",
  deleted: "destructive",
};

export const CatalogHistoryPage = () => {
  const historyQuery = useQuery({
    queryKey: ["catalog-history"],
    queryFn: () => new CatalogHistoryRepository(supabase).listRecent(),
  });

  return (
    <PageShell backTo="/admin" title={adminContent.history.title}>
      {historyQuery.isPending ? (
        <InlineLoader />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            {historyQuery.data && historyQuery.data.length > 0 ? (
              historyQuery.data.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 border-b pb-3 text-sm"
                >
                  <div className="flex flex-col gap-1">
                    <span>
                      {adminContent.history.tableLabels[entry.catalogTable]} · {entry.rowId}
                    </span>
                    <Text tone="muted">
                      {entry.modifiedBy ?? adminContent.history.systemActor} ·{" "}
                      {new Date(entry.createdAt).toLocaleString("fr-FR")}
                    </Text>
                  </div>
                  <Badge variant={ACTION_COLOR[entry.action]}>
                    {adminContent.history.actionLabels[entry.action]}
                  </Badge>
                </div>
              ))
            ) : (
              <Text tone="muted" size="sm">
                {adminContent.history.empty}
              </Text>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
};
