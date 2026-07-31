import { linkVariants } from "@/components/ui/link";
import { useMemo, useState } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { activityLogTypeSchema } from "@sorento/domain";
import { repositories } from "@/lib/repositories";
import { useDossier } from "@/hooks/use-dossier";
import { dossierContent } from "@/features/dossier/content";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { Card, CardContent } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_TYPES = "all-types";
const ALL_MEMBERS = "all-members";

export const ActivityPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const [memberFilter, setMemberFilter] = useState<string>(ALL_MEMBERS);

  const activityQuery = useQuery({
    queryKey: ["activity-log", dossierId],
    queryFn: () => repositories.activityLog.listForDossier(dossierId),
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

  const actionTypes = activityLogTypeSchema.options;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Heading level={1}>{dossierContent.activity.title}</Heading>
        <RouterLink className={linkVariants()} to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(String(value))}>
          {/* No visible label beside a filter row, so the trigger names itself. */}
          <SelectTrigger aria-label={dossierContent.activity.filterTypeLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES} textValue={dossierContent.activity.filterAllTypes}>
              {dossierContent.activity.filterAllTypes}
            </SelectItem>
            {actionTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {dossierContent.activity.actionLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={memberFilter} onValueChange={(value) => setMemberFilter(String(value))}>
          <SelectTrigger aria-label={dossierContent.activity.filterMemberLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_MEMBERS} textValue={dossierContent.activity.filterAllMembers}>
              {dossierContent.activity.filterAllMembers}
            </SelectItem>
            {access.members.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {access.profilesById.get(member.userId)?.firstName ?? member.userId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {filtered.length > 0 ? (
            filtered.map((entry) => (
              <div key={entry.id} className="flex justify-between border-b pb-2 text-sm">
                <span>
                  {entry.actorId
                    ? (access.profilesById.get(entry.actorId)?.firstName ??
                      sharedContent.unknownMember)
                    : sharedContent.unknownMember}{" "}
                  {dossierContent.activity.actionLabels[entry.actionType]}
                </span>
                <Text tone="muted">{new Date(entry.createdAt).toLocaleString("fr-FR")}</Text>
              </div>
            ))
          ) : (
            <Text tone="muted" size="sm">
              {dossierContent.activity.empty}
            </Text>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
