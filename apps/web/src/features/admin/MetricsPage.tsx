import { Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Typography } from "@heroui/react";
import { AdminMetricsRepository } from "@sorento/supabase-client";
import { supabase } from "@/lib/supabase-client";
import { adminContent } from "@/features/admin/content";
import { InlineLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";

const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
  <Card>
    <Card.Content className="flex flex-col gap-1 py-4">
      <Typography type="body-sm" color="muted">
        {label}
      </Typography>
      <Typography.Heading level={3}>{value}</Typography.Heading>
    </Card.Content>
  </Card>
);

export const MetricsPage = () => {
  const metricsQuery = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => new AdminMetricsRepository(supabase).get(),
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{adminContent.metrics.title}</Typography.Heading>
        <RouterLink className="link text-sm" to="/admin">
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{adminContent.metrics.notice}</Alert.Description>
        </Alert.Content>
      </Alert>

      {metricsQuery.isPending ? (
        <InlineLoader />
      ) : metricsQuery.data ? (
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label={adminContent.metrics.totalUsers}
            value={metricsQuery.data.totalUsers}
          />
          <MetricCard
            label={adminContent.metrics.totalDossiers}
            value={metricsQuery.data.totalDossiers}
          />
          <MetricCard
            label={adminContent.metrics.activeTrustedContactDesignations}
            value={metricsQuery.data.activeTrustedContactDesignations}
          />
          <MetricCard
            label={adminContent.metrics.trackingCompletionRatePercent}
            value={`${metricsQuery.data.trackingCompletionRatePercent}%`}
          />
          <MetricCard
            label={adminContent.metrics.activeCatalogProcedures}
            value={metricsQuery.data.activeCatalogProcedures}
          />
          <MetricCard
            label={adminContent.metrics.activeCatalogBenefits}
            value={metricsQuery.data.activeCatalogBenefits}
          />
        </div>
      ) : null}

      {metricsQuery.data ? (
        <Card>
          <Card.Header>
            <Card.Title>{adminContent.metrics.dossiersByStatus}</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2 py-2">
            {Object.entries(metricsQuery.data.dossiersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span>{adminContent.metrics.statusLabels[status as "PREPARATION" | "ACTIVE"]}</span>
                <Typography weight="medium">{count}</Typography>
              </div>
            ))}
          </Card.Content>
        </Card>
      ) : null}
    </div>
  );
};
