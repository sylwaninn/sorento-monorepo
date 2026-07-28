import type { AccountExport, AccountPort, DossierRole } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, requireRow, SupabaseRepositoryError } from "#client/errors";
import {
  mapAnswerRow,
  mapCommentRow,
  mapContractRow,
  mapDocumentRow,
  mapDossierRow,
  mapNotificationPreferenceRow,
  mapProfileRow,
  mapTrackingRow,
} from "#client/mappers";

/**
 * Portability and erasure, both bounded by RLS: every read below runs under the caller's own
 * policies, so the export can only ever contain what that person is already entitled to see.
 */
export class AccountRepository implements AccountPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  exportData = async (): Promise<AccountExport> => {
    const {
      data: { user },
      error: userError,
    } = await this.client.auth.getUser();
    assertNoError(userError, "read current user");
    if (!user) throw new SupabaseRepositoryError("export data: no authenticated user", null);

    const [
      profile,
      dossiers,
      memberships,
      answers,
      tracking,
      comments,
      documents,
      contracts,
      preferences,
    ] = await Promise.all([
      this.client.from("profiles").select().eq("id", user.id).single(),
      this.client.from("dossiers").select().is("deleted_at", null),
      this.client.from("memberships").select("dossier_id, role").eq("user_id", user.id),
      this.client.from("answers").select(),
      this.client.from("tracking").select(),
      this.client.from("comments").select().eq("author_id", user.id),
      this.client.from("documents").select().eq("added_by", user.id),
      this.client.from("contracts").select(),
      this.client.from("notification_preferences").select(),
    ]);

    assertNoError(dossiers.error, "export dossiers");
    assertNoError(memberships.error, "export memberships");
    assertNoError(answers.error, "export answers");
    assertNoError(tracking.error, "export tracking");
    assertNoError(comments.error, "export comments");
    assertNoError(documents.error, "export documents");
    assertNoError(contracts.error, "export contracts");
    assertNoError(preferences.error, "export notification preferences");

    return {
      profile: mapProfileRow(requireRow(profile.data, profile.error, "export profile")),
      dossiers: (dossiers.data ?? []).map(mapDossierRow),
      memberships: (memberships.data ?? []).map((row) => ({
        dossierId: row.dossier_id,
        role: row.role as DossierRole,
      })),
      answers: (answers.data ?? []).map(mapAnswerRow),
      tracking: (tracking.data ?? []).map(mapTrackingRow),
      comments: (comments.data ?? []).map(mapCommentRow),
      documents: (documents.data ?? []).map(mapDocumentRow),
      contracts: (contracts.data ?? []).map(mapContractRow),
      notificationPreferences: (preferences.data ?? []).map(mapNotificationPreferenceRow),
      exportedAt: new Date().toISOString(),
    };
  };

  ownedDossierCount = async (): Promise<number> => {
    const { data, error } = await this.client.rpc("owned_dossier_count");
    assertNoError(error, "count owned dossiers");
    return data ?? 0;
  };

  // Refuses while the account still owns a dossier: the database would otherwise leave that
  // dossier ownerless and unreachable for its remaining members.
  deleteAccount = async (): Promise<void> => {
    const { error } = await this.client.rpc("delete_own_account");
    assertNoError(error, "delete account");
    await this.client.auth.signOut();
  };
}
