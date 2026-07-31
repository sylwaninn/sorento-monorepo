import { PageShell } from "@/layout/PageShell";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { isRoleManageable } from "@sorento/core";
import type { DossierRole } from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PageLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import { InviteForm } from "@/features/dossier/members/InviteForm";
import { RoleSelect } from "@/features/dossier/members/RoleSelect";
import { TransferOwnershipDialog } from "@/features/dossier/members/TransferOwnershipDialog";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useDossier } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";

export const MembersPage = () => {
  const { dossierId = "" } = useParams();
  const { user } = useAuth();
  const access = useDossier(dossierId);

  const invitationsQuery = useQuery({
    queryKey: queryKeys.dossiers.invitations(dossierId),
    queryFn: () => repositories.invitations.listPendingForDossier(dossierId),
  });

  const invalidates = [
    queryKeys.dossiers.members(dossierId),
    queryKeys.dossiers.invitations(dossierId),
    queryKeys.dossiers.activity(dossierId),
    // A removed member loses their assignments, so the journey view is stale too.
    queryKeys.dossiers.tracking(dossierId),
  ];

  const changeRole = useAppMutation({
    mutationFn: ({
      membershipId,
      role,
    }: {
      membershipId: string;
      role: Exclude<DossierRole, "owner">;
    }) => repositories.memberships.changeRole(membershipId, role),
    invalidates,
  });

  const removeMember = useAppMutation({
    mutationFn: (membershipId: string) => repositories.memberships.removeMember(membershipId),
    invalidates,
  });

  const revokeInvitation = useAppMutation({
    mutationFn: (invitationId: string) => repositories.invitations.revoke(invitationId),
    invalidates,
  });

  const transferOwnership = useAppMutation({
    mutationFn: (newOwnerUserId: string) =>
      repositories.memberships.transferOwnership(dossierId, newOwnerUserId),
    invalidates,
  });

  if (access.isLoading || invitationsQuery.isPending) {
    return <PageLoader />;
  }

  return (
    <PageShell backTo={`/dossiers/${dossierId}`} title={dossierContent.members.title}>
      <ErrorAlert
        message={
          changeRole.errorMessage ??
          removeMember.errorMessage ??
          revokeInvitation.errorMessage ??
          transferOwnership.errorMessage
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{dossierContent.members.list.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {access.members.map((member) => {
            const profile = access.profilesById.get(member.userId);
            const isSelf = member.userId === user?.id;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Text className="font-medium">
                    {profile?.firstName ?? member.userId}{" "}
                    {isSelf ? dossierContent.members.selfSuffix : ""}
                  </Text>
                  <Text size="sm" tone="muted">
                    {dossierContent.members.roleLabels[member.role]} ·{" "}
                    {dossierContent.members.list.joinedOn}{" "}
                    {new Date(member.createdAt).toLocaleDateString("fr-FR")}
                  </Text>
                </div>
                {access.can("members:manage") && !isSelf && isRoleManageable(member.role) ? (
                  <div className="flex items-center gap-2">
                    <RoleSelect
                      role={member.role}
                      onChange={(role) => changeRole.mutate({ membershipId: member.id, role })}
                    />
                    {member.role === "collaborator" ? (
                      <TransferOwnershipDialog
                        memberName={profile?.firstName ?? member.userId}
                        onConfirm={() => transferOwnership.mutate(member.userId)}
                      />
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember.mutate(member.id)}
                    >
                      {dossierContent.members.list.removeButton}
                    </Button>
                  </div>
                ) : member.role !== "owner" ? (
                  <Badge>{dossierContent.members.roleLabels[member.role]}</Badge>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dossierContent.members.pending.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {invitationsQuery.data && invitationsQuery.data.length > 0 ? (
            invitationsQuery.data.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-3 border-b pb-2 text-sm"
              >
                <div className="flex flex-col">
                  <span>{invitation.email}</span>
                  <Text tone="muted">
                    {dossierContent.members.roleLabels[invitation.role]} ·{" "}
                    {dossierContent.members.pending.expiresOn}{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString("fr-FR")}
                  </Text>
                </div>
                {access.can("members:manage") ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeInvitation.mutate(invitation.id)}
                  >
                    {dossierContent.members.pending.revokeButton}
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <Text tone="muted" size="sm">
              {dossierContent.members.pending.empty}
            </Text>
          )}
        </CardContent>
      </Card>

      {access.can("members:manage") ? <InviteForm dossierId={dossierId} /> : null}
    </PageShell>
  );
};
