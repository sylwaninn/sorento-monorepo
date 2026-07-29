import { useState } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { Accordion, Button, Card, ProgressBar, Typography } from "@heroui/react";
import { useAuth } from "@/auth/useAuth";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { dossierContent } from "@/features/dossier/content";
import { TrackedItemCard } from "@/features/dossier/TrackedItemCard";
import { useDossier } from "@/hooks/use-dossier";
import { useJourney } from "@/hooks/use-journey";

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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>
          {dossierContent.dashboard.title} · {access.dossier?.subjectFirstName}{" "}
          {access.dossier?.subjectLastName}
        </Typography.Heading>
        <RouterLink className="link text-sm" to="/mes-dossiers">
          {sharedContent.back}
        </RouterLink>
      </div>

      <Card>
        <Card.Content className="flex flex-col gap-2 py-4">
          <ProgressBar
            value={journey.completionPercentage}
            minValue={0}
            maxValue={100}
            aria-label={dossierContent.dashboard.progressLabel}
          />
          <Typography type="body-sm" color="muted">
            {dossierContent.dashboard.progressValue(journey.completionPercentage)}
          </Typography>
        </Card.Content>
      </Card>

      <section className="flex flex-col gap-2">
        <Typography.Heading level={2}>{dossierContent.dashboard.focusTitle}</Typography.Heading>
        {journey.focus.length === 0 ? (
          <Card>
            <Card.Content className="text-muted py-6 text-center text-sm">
              {dossierContent.dashboard.focusEmpty}
            </Card.Content>
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
          <RouterLink key={link.to} className="link" to={`/dossiers/${dossierId}/${link.to}`}>
            {link.label}
          </RouterLink>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant={filterMine ? "ghost" : "primary"}
          size="sm"
          onPress={() => setFilterMine(false)}
        >
          {dossierContent.dashboard.filterAll}
        </Button>
        <Button
          variant={filterMine ? "primary" : "ghost"}
          size="sm"
          onPress={() => setFilterMine(true)}
        >
          {dossierContent.dashboard.filterMine}
        </Button>
      </div>

      {journey.groups.length === 0 ? (
        <Card>
          <Card.Content className="text-muted py-6 text-center text-sm">
            {dossierContent.dashboard.empty}
          </Card.Content>
        </Card>
      ) : (
        <Accordion
          allowsMultipleExpanded
          // Settled windows start folded, with a reassuring line instead of a list.
          defaultExpandedKeys={journey.groups
            .filter((group) => !group.settled)
            .map((group) => group.timeWindow)}
        >
          {journey.groups.map((group) => (
            <Accordion.Item key={group.timeWindow} id={group.timeWindow}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  {dossierContent.timeWindowLabels[group.timeWindow]} ({group.items.length})
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="flex flex-col gap-2">
                  {group.settled ? (
                    <Typography.Paragraph color="muted" size="sm">
                      {dossierContent.dashboard.doneWindowCollapsed}
                    </Typography.Paragraph>
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
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </div>
  );
};
