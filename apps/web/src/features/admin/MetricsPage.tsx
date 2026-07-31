import { linkVariants } from "@/components/ui/link";
import { Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { dossierStatusSchema } from "@sorento/domain";
import { AdminMetricsRepository } from "@sorento/supabase-client";
import { supabase } from "@/lib/supabase-client";
import { adminContent } from "@/features/admin/content";
import { InlineLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Heading, Text } from "@/components/ui/typography";

const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
  <Card>
    <CardContent className="flex flex-col gap-1 py-4">
      <Text size="sm" tone="muted">
        {label}
      </Text>
      <Heading level={3}>{value}</Heading>
    </CardContent>
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
        <Heading level={1}>{adminContent.metrics.title}</Heading>
        <RouterLink className={linkVariants()} to="/admin">
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert>
        <AlertIndicator />
        <AlertDescription>{adminContent.metrics.notice}</AlertDescription>
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
          <CardHeader>
            <CardTitle>{adminContent.metrics.dossiersByStatus}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 py-2">
            {Object.entries(metricsQuery.data.dossiersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span>{adminContent.metrics.statusLabels[dossierStatusSchema.parse(status)]}</span>
                <Text className="font-medium">{count}</Text>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
