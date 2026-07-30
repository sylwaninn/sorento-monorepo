import { linkVariants } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { useNavigate, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { evaluateJourney, isDiagnosticComplete } from "@sorento/core";
import type { TimeWindow } from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { loadAnswersFromSession } from "@/features/diagnostic/diagnostic-session";
import { attachDiagnosticFromSession } from "@/features/diagnostic/attach-diagnostic";
import { diagnosticContent } from "@/features/diagnostic/content";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator, AlertTitle } from "@/components/ui/alert";
import { Text } from "@/components/ui/typography";

const TIME_WINDOWS: TimeWindow[] = ["24h", "7d", "30d", "6m"];

export const DiagnosticResultPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const answers = loadAnswersFromSession();

  const catalogQuery = useQuery({
    queryKey: queryKeys.catalog.conditions(),
    queryFn: async () => {
      const [procedures, benefits, conditions] = await Promise.all([
        repositories.catalog.listProcedures(),
        repositories.catalog.listBenefits(),
        repositories.catalog.listConditions(),
      ]);
      return { procedures, benefits, conditions };
    },
    enabled: isDiagnosticComplete(answers),
  });

  const createDossier = useAppMutation({
    mutationFn: attachDiagnosticFromSession,
    onSuccess: (dossierId) => {
      if (dossierId !== null) navigate(`/dossiers/${dossierId}`);
    },
  });

  if (!isDiagnosticComplete(answers)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col gap-4 py-6">
            <Alert>
              <AlertIndicator />
              <AlertDescription>{diagnosticContent.result.diagnosticNotFound}</AlertDescription>
            </Alert>
            <RouterLink className={cn(linkVariants(), "text-center")} to="/diagnostic">
              {diagnosticContent.result.restart}
            </RouterLink>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (catalogQuery.isPending) return <PageLoader />;
  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <div className="mx-auto max-w-md p-4 py-8">
        <ErrorAlert message="Le catalogue n’a pas pu être chargé. Réessayez dans un instant." />
      </div>
    );
  }

  const deathDate =
    answers["mode"] === "death" && typeof answers["deathDate"] === "string"
      ? answers["deathDate"]
      : null;
  const journey = evaluateJourney({
    procedures: catalogQuery.data.procedures,
    benefits: catalogQuery.data.benefits,
    conditions: catalogQuery.data.conditions,
    answers,
    deathDate,
  });

  const countsByTimeWindow = TIME_WINDOWS.map((timeWindow) => ({
    timeWindow,
    count: journey.procedures.filter((p) => p.timeWindow === timeWindow).length,
  })).filter((entry) => entry.count > 0);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{diagnosticContent.result.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ErrorAlert message={createDossier.errorMessage} />

          <Alert>
            <AlertIndicator />
            <AlertDescription>{diagnosticContent.result.notice}</AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-md border p-4">
              <div className="text-2xl font-semibold">{journey.procedures.length}</div>
              <div className="text-muted text-sm">
                {diagnosticContent.result.proceduresIdentified}
              </div>
            </div>
            <div className="rounded-md border p-4">
              <div className="select-none text-2xl font-semibold blur-sm">
                {journey.benefits.length}
              </div>
              <div className="text-muted text-sm">{diagnosticContent.result.potentialBenefits}</div>
            </div>
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            {countsByTimeWindow.map(({ timeWindow, count }) => (
              <li key={timeWindow} className="flex justify-between">
                <span>{diagnosticContent.result.timeWindows[timeWindow]}</span>
                <Text className="font-medium">{count}</Text>
              </li>
            ))}
          </ul>

          {journey.benefits.length > 0 ? (
            <Alert variant="accent">
              <AlertIndicator />
              <AlertTitle>{diagnosticContent.result.forgottenMoneyBlock.title}</AlertTitle>
              <AlertDescription className="select-none blur-sm">
                {diagnosticContent.result.forgottenMoneyBlock.description}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {session ? (
            <>
              <Text align="center" tone="muted" size="sm">
                {diagnosticContent.result.alreadyLoggedIn.description}
              </Text>
              <Button
                variant="default"
                className="w-full"
                pending={createDossier.isPending}
                onClick={() => createDossier.mutate(undefined)}
              >
                {diagnosticContent.result.alreadyLoggedIn.button}
              </Button>
            </>
          ) : (
            <>
              <Text align="center" tone="muted" size="sm">
                {diagnosticContent.result.cta.description}
              </Text>
              <RouterLink to="/inscription">
                <Button variant="default" className="w-full">
                  {diagnosticContent.result.cta.button}
                </Button>
              </RouterLink>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
