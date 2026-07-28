import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { can, isAssignable, type DossierAction } from "@sorento/core";
import type { Dossier, DossierRole, Membership, Profile } from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { sharedContent } from "@/components/content";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";

export interface DossierContext {
  dossier: Dossier | null;
  members: Membership[];
  assignableMembers: Membership[];
  profilesById: Map<string, Profile>;
  role: DossierRole | null;
  isLoading: boolean;
  /** Permission check delegated to the core matrix — no role comparison lives in the UI. */
  can: (action: DossierAction) => boolean;
  /** Accepts null so a deleted account renders as a neutral label, never as a blank. */
  firstNameOf: (userId: string | null) => string;
}

/**
 * The dossier a screen is working on, with the viewer's role resolved. Permissions come from
 * packages/core so this hook and the RLS policies read the same matrix; the UI hides, the RLS
 * forbids, and the two cannot drift apart in different directions.
 */
export const useDossier = (dossierId: string): DossierContext => {
  const { user } = useAuth();

  const dossierQuery = useQuery({
    queryKey: queryKeys.dossiers.detail(dossierId),
    queryFn: () => repositories.dossiers.getById(dossierId),
    enabled: dossierId !== "",
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.dossiers.members(dossierId),
    queryFn: () => repositories.memberships.listForDossier(dossierId),
    enabled: dossierId !== "",
  });

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const memberIds = useMemo(() => members.map((member) => member.userId), [members]);

  const profilesQuery = useQuery({
    queryKey: [...queryKeys.dossiers.memberProfiles(dossierId), memberIds],
    queryFn: () => repositories.profiles.listByIds(memberIds),
    enabled: memberIds.length > 0,
  });

  const profilesById = useMemo(
    () => new Map((profilesQuery.data ?? []).map((profile) => [profile.id, profile])),
    [profilesQuery.data],
  );

  const role = members.find((member) => member.userId === user?.id)?.role ?? null;

  return {
    dossier: dossierQuery.data ?? null,
    members,
    assignableMembers: members.filter((member) => isAssignable(member.role)),
    profilesById,
    role,
    isLoading: dossierQuery.isPending || membersQuery.isPending,
    can: (action) => can(role, action),
    firstNameOf: (userId) =>
      userId === null
        ? sharedContent.deletedAccount
        : (profilesById.get(userId)?.firstName ?? sharedContent.unknownMember),
  };
};
