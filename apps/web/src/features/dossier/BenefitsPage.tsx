import { linkVariants } from "@/components/ui/link";
import { useMemo } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQueries } from "@tanstack/react-query";
import { eligibleBenefits } from "@sorento/core";
import type { Benefit, DiagnosticAnswers } from "@sorento/domain";
import { CatalogNotice } from "@/components/CatalogNotice";
import { CautionNotice } from "@/components/CautionNotice";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
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
import { Heading, Text } from "@/components/ui/typography";
import { Link } from "@/components/ui/link";

export const BenefitsPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);

  const [answersQuery, benefitsQuery, conditionsQuery, trackingQuery] = useQueries({
    queries: [
      {
        queryKey: queryKeys.dossiers.answers(dossierId),
        queryFn: () => repositories.answers.listForDossier(dossierId),
      },
      {
        queryKey: queryKeys.catalog.benefits(),
        queryFn: () => repositories.catalog.listBenefits(),
      },
      {
        queryKey: queryKeys.catalog.conditions(),
        queryFn: () => repositories.catalog.listConditions(),
      },
      {
        queryKey: queryKeys.dossiers.tracking(dossierId),
        queryFn: () => repositories.tracking.listForDossier(dossierId),
      },
    ],
  });

  const answers: DiagnosticAnswers = useMemo(
    () =>
      Object.fromEntries((answersQuery?.data ?? []).map((answer) => [answer.key, answer.value])),
    [answersQuery?.data],
  );

  const addToTracking = useAppMutation({
    mutationFn: (benefitId: string) => repositories.tracking.createForBenefit(dossierId, benefitId),
    invalidates: [queryKeys.dossiers.tracking(dossierId)],
  });

  if (
    access.isLoading ||
    answersQuery?.isPending ||
    benefitsQuery?.isPending ||
    conditionsQuery?.isPending ||
    trackingQuery?.isPending
  ) {
    return <PageLoader />;
  }

  const eligible = eligibleBenefits(
    benefitsQuery?.data ?? [],
    conditionsQuery?.data ?? [],
    answers,
  );
  const trackedBenefitIds = new Set(
    (trackingQuery?.data ?? []).flatMap((entry) =>
      entry.benefitId === null ? [] : [entry.benefitId],
    ),
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Heading level={1}>{dossierContent.benefits.title}</Heading>
        <RouterLink className={linkVariants()} to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <ErrorAlert message={addToTracking.errorMessage} />

      {eligible.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-6 text-center text-sm">
            {dossierContent.benefits.empty}
          </CardContent>
        </Card>
      ) : (
        eligible.map((benefit: Benefit) => (
          <div key={benefit.id} className="flex flex-col gap-2">
            <Card>
              <CardHeader>
                <CardTitle>{benefit.title}</CardTitle>
                <CardDescription>{benefit.mainCondition}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {/* The prudent wording comes from the catalog row and is always rendered. */}
                <CautionNotice cautionText={benefit.cautionText} />
                {benefit.estimatedAmount === null ? null : (
                  <Text size="sm">
                    {dossierContent.benefits.amountPrefix} {benefit.estimatedAmount}
                  </Text>
                )}
                <Text tone="muted" size="sm">
                  {benefit.organization}
                </Text>
                <Link href={benefit.formUrl} target="_blank" rel="noreferrer noopener">
                  {dossierContent.benefits.formLink}
                </Link>
              </CardContent>
              <CardFooter>
                <Button
                  variant="default"
                  disabled={trackedBenefitIds.has(benefit.id) || !access.can("tracking:update")}
                  pending={addToTracking.isPending && addToTracking.variables === benefit.id}
                  onClick={() => addToTracking.mutate(benefit.id)}
                >
                  {trackedBenefitIds.has(benefit.id)
                    ? dossierContent.benefits.alreadyAdded
                    : dossierContent.benefits.addButton}
                </Button>
              </CardFooter>
            </Card>
            <CatalogNotice
              sourceUrl={benefit.sourceUrl}
              lastVerifiedDate={benefit.lastVerifiedDate}
              referenceProfession={null}
            />
          </div>
        ))
      )}
    </div>
  );
};
