import type { DossierRole, Membership, MembershipPort } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, requireRow } from "#client/errors";
import { mapMembershipRow } from "#client/mappers";

export class MembershipRepository implements MembershipPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listForDossier = async (dossierId: string): Promise<Membership[]> => {
    const { data, error } = await this.client
      .from("memberships")
      .select()
      .eq("dossier_id", dossierId)
      .order("created_at", { ascending: true });

    assertNoError(error, "list dossier members");
    return (data ?? []).map(mapMembershipRow);
  };

  // Direct add for a user who already has an account. The email-invite flow (invitee not
  // yet registered) goes through a dedicated Edge Function.
  addMember = async (
    dossierId: string,
    userId: string,
    role: Exclude<DossierRole, "owner" | "trusted_contact">,
    invitedBy: string,
  ): Promise<Membership> => {
    const { data, error } = await this.client
      .from("memberships")
      .insert({ dossier_id: dossierId, user_id: userId, role, invited_by: invitedBy })
      .select()
      .single();

    return mapMembershipRow(requireRow(data, error, "add dossier member"));
  };

  changeRole = async (id: string, role: Exclude<DossierRole, "owner">): Promise<Membership> => {
    const { data, error } = await this.client
      .from("memberships")
      .update({ role })
      .eq("id", id)
      .select()
      .single();

    return mapMembershipRow(requireRow(data, error, "change member role"));
  };

  removeMember = async (id: string): Promise<void> => {
    const { error } = await this.client.from("memberships").delete().eq("id", id);
    assertNoError(error, "remove dossier member");
  };

  // Atomic two-step role swap (see transfer_dossier_ownership in the migration) — the new
  // owner must already be a collaborator on the dossier.
  transferOwnership = async (dossierId: string, newOwnerUserId: string): Promise<void> => {
    const { error } = await this.client.rpc("transfer_dossier_ownership", {
      p_dossier_id: dossierId,
      p_new_owner_user_id: newOwnerUserId,
    });
    assertNoError(error, "transfer dossier ownership");
  };
}
