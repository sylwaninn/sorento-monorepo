import { Card, Label, ListBox, Select, Typography } from "@heroui/react";
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
      <Card.Content className="flex flex-col gap-4 py-4">
        <p>{procedure.description}</p>
        <Typography.Paragraph color="muted" size="sm">
          {dossierContent.procedureDetail.organizationLabel}: {procedure.organization}
          {procedure.recipientAddress === null ? "" : ` · ${procedure.recipientAddress}`}
        </Typography.Paragraph>

        <ErrorAlert message={statusMutation.errorMessage ?? assigneeMutation.errorMessage} />

        <Select
          isDisabled={!canEdit}
          value={tracking.status}
          onChange={(value) => statusMutation.mutate(trackingStatusSchema.parse(value))}
          placeholder={dossierContent.procedureDetail.statusLabel}
        >
          <Label>{dossierContent.procedureDetail.statusLabel}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {STATUS_OPTIONS.map((option) => (
                <ListBox.Item
                  key={option}
                  id={option}
                  textValue={dossierContent.statusLabels[option]}
                >
                  {dossierContent.statusLabels[option]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          isDisabled={!access.can("tracking:assign")}
          value={tracking.assignedTo ?? UNASSIGNED}
          onChange={(value) => assigneeMutation.mutate(value === UNASSIGNED ? null : String(value))}
          placeholder={dossierContent.procedureDetail.assigneeLabel}
        >
          <Label>{dossierContent.procedureDetail.assigneeLabel}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id={UNASSIGNED} textValue={dossierContent.dashboard.unassigned}>
                {dossierContent.dashboard.unassigned}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {/* Viewers are never assignable: the same rule the database trigger enforces. */}
              {access.assignableMembers.map((member) => (
                <ListBox.Item
                  key={member.userId}
                  id={member.userId}
                  textValue={access.firstNameOf(member.userId)}
                >
                  {access.firstNameOf(member.userId)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </Card.Content>
    </Card>
  );
};
