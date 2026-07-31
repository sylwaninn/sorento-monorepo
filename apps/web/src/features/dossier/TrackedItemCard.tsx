import { Link as RouterLink } from "react-router";
import { dueDateCategory, type CalendarDate, type TrackedItem } from "@sorento/core";
import type { TrackingStatus } from "@sorento/domain";
import { dossierContent } from "@/features/dossier/content";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const STATUS_COLOR: Record<TrackingStatus, "default" | "accent" | "success" | "warning"> = {
  todo: "default",
  in_progress: "accent",
  waiting: "warning",
  done: "success",
  not_applicable: "default",
};

const formatDate = (isoDate: CalendarDate): string => {
  const [year, month, day] = isoDate.split("-");
  return year !== undefined && month !== undefined && day !== undefined
    ? `${day}/${month}/${year}`
    : isoDate;
};

/**
 * Deadline wording, deliberately unalarming: no counter of days late, no red. An overdue
 * procedure reads "à traiter dès que possible", which is information, not a reproach.
 * The categorisation itself comes from core; only the wording lives here.
 */
const deadlineLabel = (dueDate: CalendarDate | null, today: CalendarDate): string => {
  if (dueDate === null) return dossierContent.dashboard.noDueDate;
  const category = dueDateCategory(dueDate, today);
  if (category === "overdue") return dossierContent.dashboard.overdue;
  if (category === "due_soon") return dossierContent.dashboard.dueSoon;
  return dossierContent.dashboard.dueLater(formatDate(dueDate));
};

export interface TrackedItemCardProps {
  entry: TrackedItem;
  today: CalendarDate;
  dossierId: string;
  assigneeFirstName: string | null;
  commentCount: number;
}

export const TrackedItemCard = ({
  entry,
  today,
  dossierId,
  assigneeFirstName,
  commentCount,
}: TrackedItemCardProps) => {
  const href =
    entry.item.kind === "procedure"
      ? `/dossiers/${dossierId}/demarches/${entry.item.id}`
      : `/dossiers/${dossierId}/aides`;

  return (
    <RouterLink to={href}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="flex flex-col gap-1">
            <Text className="font-medium">{entry.item.title}</Text>
            <Text size="sm" tone="muted">
              {entry.item.organization}
            </Text>
            <Text size="sm" tone="muted">
              {deadlineLabel(entry.dueDate, today)}
            </Text>
          </div>
          <div className="flex items-center gap-3">
            {commentCount > 0 ? (
              <Badge variant="secondary">
                {dossierContent.dashboard.commentsBadge(commentCount)}
              </Badge>
            ) : null}
            <Badge variant={STATUS_COLOR[entry.tracking.status]}>
              {dossierContent.statusLabels[entry.tracking.status]}
            </Badge>
            {assigneeFirstName === null ? null : (
              <Avatar size="sm">
                <AvatarFallback>{assigneeFirstName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardContent>
      </Card>
    </RouterLink>
  );
};
