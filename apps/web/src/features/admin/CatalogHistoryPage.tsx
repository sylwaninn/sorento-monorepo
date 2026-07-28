import { Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, Chip, Typography } from "@heroui/react";
import { CatalogHistoryRepository } from "@sorento/supabase-client";
import type { CatalogHistoryAction } from "@sorento/domain";
import { supabase } from "@/lib/supabase-client";
import { adminContent } from "@/features/admin/content";
import { InlineLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";

const ACTION_COLOR: Record<CatalogHistoryAction, "success" | "accent" | "danger"> = {
  created: "success",
  updated: "accent",
  deleted: "danger",
};

export const CatalogHistoryPage = () => {
  const historyQuery = useQuery({
    queryKey: ["catalog-history"],
    queryFn: () => new CatalogHistoryRepository(supabase).listRecent(),
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{adminContent.history.title}</Typography.Heading>
        <RouterLink className="link text-sm" to="/admin">
          {sharedContent.back}
        </RouterLink>
      </div>

      {historyQuery.isPending ? (
        <InlineLoader />
      ) : (
        <Card>
          <Card.Content className="flex flex-col gap-3 py-4">
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
                    <Typography color="muted">
                      {entry.modifiedBy ?? adminContent.history.systemActor} ·{" "}
                      {new Date(entry.createdAt).toLocaleString("fr-FR")}
                    </Typography>
                  </div>
                  <Chip color={ACTION_COLOR[entry.action]}>
                    {adminContent.history.actionLabels[entry.action]}
                  </Chip>
                </div>
              ))
            ) : (
              <Typography.Paragraph color="muted" size="sm">
                {adminContent.history.empty}
              </Typography.Paragraph>
            )}
          </Card.Content>
        </Card>
      )}
    </div>
  );
};
