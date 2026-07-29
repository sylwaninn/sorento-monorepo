import type {
  CreateInvitationInput,
  CreateInvitationResult,
  Invitation,
  InvitationPort,
  ResolveInvitationResult,
} from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, assertNoFunctionError } from "#client/errors";
import { mapInvitationRow } from "#client/mappers";

// Creation and acceptance are intentionally NOT here: they go through the invite-member /
// resolve-invitation / accept-invitation Edge Functions, which own the raw token.
export class InvitationRepository implements InvitationPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listPendingForDossier = async (dossierId: string): Promise<Invitation[]> => {
    const { data, error } = await this.client
      .from("invitations")
      .select()
      .eq("dossier_id", dossierId)
      .is("used_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    assertNoError(error, "list pending invitations");
    return (data ?? []).map(mapInvitationRow);
  };

  revoke = async (id: string): Promise<void> => {
    const { error } = await this.client
      .from("invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    assertNoError(error, "revoke invitation");
  };

  create = async (input: CreateInvitationInput): Promise<CreateInvitationResult> => {
    const { data, error } = await this.client.functions.invoke<CreateInvitationResult>(
      "invite-member",
      {
        body: input,
      },
    );
    await assertNoFunctionError(error, "create invitation");
    if (!data) throw new Error("create invitation: no data returned");
    return data;
  };

  resolve = async (token: string): Promise<ResolveInvitationResult> => {
    const { data, error } = await this.client.functions.invoke<ResolveInvitationResult>(
      "resolve-invitation",
      {
        body: { token },
      },
    );
    await assertNoFunctionError(error, "resolve invitation");
    if (!data) throw new Error("resolve invitation: no data returned");
    return data;
  };

  accept = async (token: string): Promise<{ dossierId: string }> => {
    const { data, error } = await this.client.functions.invoke<{ dossierId: string }>(
      "accept-invitation",
      {
        body: { token },
      },
    );
    await assertNoFunctionError(error, "accept invitation");
    if (!data) throw new Error("accept invitation: no data returned");
    return data;
  };
}
