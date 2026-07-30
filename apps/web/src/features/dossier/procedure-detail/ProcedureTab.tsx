import {
  trackingStatusSchema,
  type Procedure,
  type Tracking,
  type TrackingStatus,
} from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { dossierContent } from "@/features/dossier/content";
import type { AppMutation } from "@/hooks/use-app-mutation";
import type { DossierContext } from "@/hooks/use-dossier";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS: TrackingStatus[] = [
  "todo",
  "in_progress",
  "waiting",
  "done",
  "not_applicable",
];
const UNASSIGNED = "unassigned";

export interface ProcedureTabProps {
  procedure: Procedure;
  tracking: Tracking;
  access: DossierContext;
  statusMutation: AppMutation<TrackingStatus, unknown>;
  assigneeMutation: AppMutation<string | null, unknown>;
}

export const ProcedureTab = ({
  procedure,
  tracking,
  access,
  statusMutation,
  assigneeMutation,
}: ProcedureTabProps) => {
  const canEdit = access.can("tracking:update");

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <p>{procedure.description}</p>
        <Text tone="muted" size="sm">
          {dossierContent.procedureDetail.organizationLabel}: {procedure.organization}
          {procedure.recipientAddress === null ? "" : ` · ${procedure.recipientAddress}`}
        </Text>

        <ErrorAlert message={statusMutation.errorMessage ?? assigneeMutation.errorMessage} />

        <Select
          disabled={!canEdit}
          value={tracking.status}
          onValueChange={(value) => statusMutation.mutate(trackingStatusSchema.parse(value))}
        >
          <SelectTrigger aria-label={dossierContent.procedureDetail.statusLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {dossierContent.statusLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          disabled={!access.can("tracking:assign")}
          value={tracking.assignedTo ?? UNASSIGNED}
          onValueChange={(value) =>
            assigneeMutation.mutate(value === UNASSIGNED ? null : String(value))
          }
        >
          <SelectTrigger aria-label={dossierContent.procedureDetail.assigneeLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED} textValue={dossierContent.dashboard.unassigned}>
              {dossierContent.dashboard.unassigned}
            </SelectItem>
            {/* Viewers are never assignable: the same rule the database trigger enforces. */}
            {access.assignableMembers.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {access.firstNameOf(member.userId)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};
