import { PageShell } from "@/layout/PageShell";
import { linkVariants } from "@/components/ui/link";
import { useState } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { PageLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import { TrackedItemCard } from "@/features/dossier/TrackedItemCard";
import { useDossier } from "@/hooks/use-dossier";
import { useJourney } from "@/hooks/use-journey";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const SECTION_LINKS = [
  { to: "aides", label: dossierContent.dashboard.benefitsLink },
  { to: "argent-oublie", label: dossierContent.dashboard.forgottenMoneyLink },
  { to: "documents", label: dossierContent.dashboard.documentsLink },
  { to: "membres", label: dossierContent.dashboard.membersLink },
  { to: "activite", label: dossierContent.dashboard.activityLink },
] as const;

export const DossierDashboardPage = () => {
  const { dossierId = "" } = useParams();
  const { user } = useAuth();
  const access = useDossier(dossierId);
  const [filterMine, setFilterMine] = useState(false);
  const journey = useJourney(
    dossierId,
    access.dossier,
    filterMine ? (user?.id ?? null) : undefined,
  );

  if (access.isLoading || journey.isLoading) return <PageLoader />;

  const assigneeOf = (assignedTo: string | null): string | null =>
    assignedTo === null ? null : access.firstNameOf(assignedTo);

  return (
    <PageShell
      backTo="/mes-dossiers"
      title={
        <>
          {dossierContent.dashboard.title} · {access.dossier?.subjectFirstName}{" "}
          {access.dossier?.subjectLastName}
        </>
      }
    >
      <Card>
        <CardContent className="flex flex-col gap-2 py-4">
          <Progress
            aria-label={dossierContent.dashboard.progressLabel}
            value={journey.completionPercentage}
          />
          <Text size="sm" tone="muted">
            {dossierContent.dashboard.progressValue(journey.completionPercentage)}
          </Text>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <Heading level={2}>{dossierContent.dashboard.focusTitle}</Heading>
        {journey.focus.length === 0 ? (
          <Card>
            <CardContent className="text-muted py-6 text-center text-sm">
              {dossierContent.dashboard.focusEmpty}
            </CardContent>
          </Card>
        ) : (
          journey.focus.map((entry) => (
            <TrackedItemCard
              key={entry.tracking.id}
              entry={entry}
              today={journey.today}
              dossierId={dossierId}
              assigneeFirstName={assigneeOf(entry.tracking.assignedTo)}
              commentCount={journey.commentCountByProcedureId.get(entry.item.id) ?? 0}
            />
          ))
        )}
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        {SECTION_LINKS.map((link) => (
          <RouterLink
            key={link.to}
            className={linkVariants({ size: "inherit" })}
            to={`/dossiers/${dossierId}/${link.to}`}
          >
            {link.label}
          </RouterLink>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant={filterMine ? "ghost" : "default"}
          size="sm"
          onClick={() => setFilterMine(false)}
        >
          {dossierContent.dashboard.filterAll}
        </Button>
        <Button
          variant={filterMine ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterMine(true)}
        >
          {dossierContent.dashboard.filterMine}
        </Button>
      </div>

      {journey.groups.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-6 text-center text-sm">
            {dossierContent.dashboard.empty}
          </CardContent>
        </Card>
      ) : (
        <Accordion
          // Settled windows start folded, with a reassuring line instead of a list.
          defaultValue={journey.groups
            .filter((group) => !group.settled)
            .map((group) => group.timeWindow)}
          type="multiple"
        >
          {journey.groups.map((group) => (
            <AccordionItem key={group.timeWindow} value={group.timeWindow}>
              <AccordionTrigger>
                {dossierContent.timeWindowLabels[group.timeWindow]} ({group.items.length})
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2">
                {group.settled ? (
                  <Text tone="muted" size="sm">
                    {dossierContent.dashboard.doneWindowCollapsed}
                  </Text>
                ) : null}
                {group.items.map((entry) => (
                  <TrackedItemCard
                    key={entry.tracking.id}
                    entry={entry}
                    today={journey.today}
                    dossierId={dossierId}
                    assigneeFirstName={assigneeOf(entry.tracking.assignedTo)}
                    commentCount={journey.commentCountByProcedureId.get(entry.item.id) ?? 0}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </PageShell>
  );
};
