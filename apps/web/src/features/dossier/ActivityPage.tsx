import { useMemo, useState } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, ListBox, Select, Typography } from "@heroui/react";
import type { ActivityLogType } from "@sorento/domain";
import { ActivityLogRepository } from "@sorento/supabase-client";
import { supabase } from "@/lib/supabase-client";
import { useDossier } from "@/hooks/use-dossier";
import { dossierContent } from "@/features/dossier/content";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";

const ALL_TYPES = "all-types";
const ALL_MEMBERS = "all-members";

export const ActivityPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const [memberFilter, setMemberFilter] = useState<string>(ALL_MEMBERS);

  const activityQuery = useQuery({
    queryKey: ["activity-log", dossierId],
    queryFn: () => new ActivityLogRepository(supabase).listForDossier(dossierId),
  });

  const filtered = useMemo(() => {
    return (activityQuery.data ?? []).filter((entry) => {
      if (typeFilter !== ALL_TYPES && entry.actionType !== typeFilter) return false;
      if (memberFilter !== ALL_MEMBERS && entry.actorId !== memberFilter) return false;
      return true;
    });
  }, [activityQuery.data, typeFilter, memberFilter]);

  if (access.isLoading || activityQuery.isPending) {
    return <PageLoader />;
  }

  const actionTypes = Object.keys(dossierContent.activity.actionLabels) as ActivityLogType[];

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{dossierContent.activity.title}</Typography.Heading>
        <RouterLink className="link text-sm" to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <div className="flex gap-3">
        <Select value={typeFilter} onChange={(value) => setTypeFilter(String(value))}>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id={ALL_TYPES} textValue={dossierContent.activity.filterAllTypes}>
                {dossierContent.activity.filterAllTypes}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {actionTypes.map((type) => (
                <ListBox.Item
                  key={type}
                  id={type}
                  textValue={dossierContent.activity.actionLabels[type]}
                >
                  {dossierContent.activity.actionLabels[type]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select value={memberFilter} onChange={(value) => setMemberFilter(String(value))}>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id={ALL_MEMBERS} textValue={dossierContent.activity.filterAllMembers}>
                {dossierContent.activity.filterAllMembers}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {access.members.map((member) => (
                <ListBox.Item
                  key={member.userId}
                  id={member.userId}
                  textValue={access.profilesById.get(member.userId)?.firstName ?? member.userId}
                >
                  {access.profilesById.get(member.userId)?.firstName ?? member.userId}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <Card>
        <Card.Content className="flex flex-col gap-3 py-4">
          {filtered.length > 0 ? (
            filtered.map((entry) => (
              <div key={entry.id} className="flex justify-between border-b pb-2 text-sm">
                <span>
                  {entry.actorId ? (access.profilesById.get(entry.actorId)?.firstName ?? "—") : "—"}{" "}
                  {dossierContent.activity.actionLabels[entry.actionType]}
                </span>
                <Typography color="muted">
                  {new Date(entry.createdAt).toLocaleString("fr-FR")}
                </Typography>
              </div>
            ))
          ) : (
            <Typography.Paragraph color="muted" size="sm">
              {dossierContent.activity.empty}
            </Typography.Paragraph>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};
