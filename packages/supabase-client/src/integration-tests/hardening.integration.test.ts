import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AccountRepository } from "#client/repositories/account-repository";
import { AnswerRepository } from "#client/repositories/answer-repository";
import { CommentRepository } from "#client/repositories/comment-repository";
import { DossierRepository } from "#client/repositories/dossier-repository";
import { MembershipRepository } from "#client/repositories/membership-repository";
import { NotificationPreferenceRepository } from "#client/repositories/notification-preference-repository";
import { NotificationRepository } from "#client/repositories/notification-repository";
import { TrackingRepository } from "#client/repositories/tracking-repository";
import { query } from "#client/integration-tests/database";
import {
  createActiveTestDossier,
  createMember,
  createOwnedDossier,
  createTestUser,
  fetchAProcedureId,
  grantMembership,
  must,
  serviceRoleClient,
  type TestUser,
} from "#client/integration-tests/helpers";

// Covers the policies added by the hardening migrations. Each of these was a real hole:
// a forgeable audit trail, a bin that revoked nothing, notifications readable by anyone,
// and a creator who kept access forever.

describe("RLS: the activity log cannot be written by a client", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Olivia", status: "ACTIVE" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    collaborator = await createMember(dossierId, "collaborator", "Colin");
  });

  it("a collaborator cannot insert an entry, forged or otherwise", async () => {
    const { error } = await collaborator.client.from("activity_log").insert({
      dossier_id: dossierId,
      actor_id: owner.id,
      action_type: "status_changed",
      target_id: null,
      details: {},
    });

    expect(error).not.toBeNull();
  });

  it("a status change is journalled by the database, attributed to whoever made it", async () => {
    const procedureId = await fetchAProcedureId();
    const tracking = await new TrackingRepository(collaborator.client).createForProcedure(
      dossierId,
      procedureId,
    );
    await new TrackingRepository(collaborator.client).update(tracking.id, {
      status: "in_progress",
    });

    const { data } = await collaborator.client
      .from("activity_log")
      .select("actor_id, action_type")
      .eq("dossier_id", dossierId)
      .eq("action_type", "status_changed");

    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0]?.actor_id).toBe(collaborator.id);
  });
});

describe("RLS: a soft-deleted dossier revokes access to its content", () => {
  let owner: TestUser;
  let dossierId: string;

  // Each test bins a dossier of its own. The write test used to inherit the deletion the read
  // test performed, so it only held as long as vitest ran the file in declaration order.
  beforeEach(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Oscar", status: "ACTIVE" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    await new TrackingRepository(owner.client).createForProcedure(
      dossierId,
      await fetchAProcedureId(),
    );
  });

  it("the tracking rows disappear once the dossier is in the bin", async () => {
    const trackingBefore = await new TrackingRepository(owner.client).listForDossier(dossierId);
    expect(trackingBefore.length).toBeGreaterThan(0);

    await new DossierRepository(owner.client).softDelete(dossierId);

    const trackingAfter = await new TrackingRepository(owner.client).listForDossier(dossierId);
    expect(trackingAfter).toEqual([]);
    expect(await new DossierRepository(owner.client).getById(dossierId)).toBeNull();
  });

  it("a binned dossier can no longer be written to either", async () => {
    await new DossierRepository(owner.client).softDelete(dossierId);

    const { error } = await owner.client
      .from("comments")
      .insert({ dossier_id: dossierId, author_id: owner.id, content: "après suppression" });

    expect(error).not.toBeNull();
  });
});

describe("RLS: creating a dossier does not grant permanent access", () => {
  it("the previous owner loses the dossier once ownership moves on", async () => {
    const creator = await createTestUser("Camille");
    const successor = await createTestUser("Sacha");

    const dossier = await new DossierRepository(creator.client).create({
      subjectFirstName: "Paul",
      subjectLastName: "Girard",
      status: "PREPARATION",
    });
    await grantMembership(dossier.id, successor, "collaborator");
    await new MembershipRepository(creator.client).transferOwnership(dossier.id, successor.id);

    // created_by still points at them, which used to be enough to keep reading the dossier.
    const { data: membership } = await serviceRoleClient()
      .from("memberships")
      .select("id")
      .eq("dossier_id", dossier.id)
      .eq("user_id", creator.id)
      .single();
    await serviceRoleClient()
      .from("memberships")
      .delete()
      .eq("id", must(membership, "creator membership").id);

    expect(await new DossierRepository(creator.client).getById(dossier.id)).toBeNull();
    expect(await new DossierRepository(successor.client).getById(dossier.id)).not.toBeNull();
  });
});

describe("RLS: notifications are strictly personal", () => {
  let recipient: TestUser;
  let other: TestUser;
  let dossierId: string;

  // create_notification is a server-only function, so a notification a test needs to already
  // exist is inserted the way the triggers insert theirs.
  const seedNotification = async (): Promise<string> => {
    const { data, error } = await serviceRoleClient()
      .from("notifications")
      .insert({
        user_id: recipient.id,
        dossier_id: dossierId,
        type: "mention",
        target_id: null,
        payload: {},
      })
      .select("id")
      .single();
    if (error) throw error;
    return must(data, "seeded notification").id;
  };

  const isRead = async (notificationId: string): Promise<boolean> => {
    const { data } = await serviceRoleClient()
      .from("notifications")
      .select("read")
      .eq("id", notificationId)
      .single();
    return must(data, "notification").read;
  };

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Noa", status: "ACTIVE" });
    recipient = fixture.owner;
    dossierId = fixture.dossierId;
    other = await createMember(dossierId, "collaborator", "Nina");
  });

  it("a member never reads another member's notifications", async () => {
    const notificationId = await seedNotification();

    const seenByRecipient = await new NotificationRepository(recipient.client).listForCurrentUser();
    const seenByOther = await new NotificationRepository(other.client).listForCurrentUser();

    expect(seenByRecipient.map((notification) => notification.id)).toContain(notificationId);
    expect(seenByOther.map((notification) => notification.id)).not.toContain(notificationId);
  });

  it("the recipient marks their own notification as read", async () => {
    const notificationId = await seedNotification();

    await new NotificationRepository(recipient.client).markRead(notificationId);

    expect(await isRead(notificationId)).toBe(true);
  });

  // The update policy denies by matching no row, which returns no error. Only reading the row
  // back distinguishes a refusal from a write that silently went through.
  it("another member cannot mark it as read on their behalf", async () => {
    const notificationId = await seedNotification();

    await new NotificationRepository(other.client).markRead(notificationId);

    expect(await isRead(notificationId)).toBe(false);
  });

  it("marking everything read stops at your own list", async () => {
    const notificationId = await seedNotification();

    await new NotificationRepository(other.client).markAllRead(recipient.id);

    expect(await isRead(notificationId)).toBe(false);
  });
});

describe("RLS: notification preferences are personal", () => {
  let user: TestUser;
  let other: TestUser;

  const storedPreferenceCount = async (userId: string, eventType: string): Promise<number> => {
    const { data } = await serviceRoleClient()
      .from("notification_preferences")
      .select("event_type")
      .eq("user_id", userId)
      .eq("event_type", eventType);
    return must(data, `stored ${eventType} preference`).length;
  };

  beforeAll(async () => {
    user = await createTestUser("Prudence");
    other = await createTestUser("Perrine");
  });

  it("a user records an override and reads it back", async () => {
    await new NotificationPreferenceRepository(user.client).setPreference(
      user.id,
      "mention",
      true,
      false,
    );

    const preferences = await new NotificationPreferenceRepository(
      user.client,
    ).listForCurrentUser();
    const mention = must(
      preferences.find((preference) => preference.eventType === "mention"),
      "mention preference",
    );
    expect(mention.email).toBe(false);
  });

  it("someone else's overrides are invisible", async () => {
    await new NotificationPreferenceRepository(other.client).setPreference(
      other.id,
      "weekly_digest",
      false,
      false,
    );

    const preferences = await new NotificationPreferenceRepository(
      user.client,
    ).listForCurrentUser();
    expect(
      preferences.find((preference) => preference.eventType === "weekly_digest"),
    ).toBeUndefined();
  });

  // Silencing someone else's notifications would be a way to keep them from noticing anything.
  it("a user cannot record an override for someone else", async () => {
    await expect(
      new NotificationPreferenceRepository(user.client).setPreference(
        other.id,
        "procedure_assigned",
        false,
        false,
      ),
    ).rejects.toThrow();

    expect(await storedPreferenceCount(other.id, "procedure_assigned")).toBe(0);
  });

  // Deleting an override is how the app returns a type to its default, and the repository has
  // no method for it: the screen deletes the row directly.
  it("a user deletes their own override but not someone else's", async () => {
    const preferences = new NotificationPreferenceRepository(user.client);
    await preferences.setPreference(user.id, "member_joined", false, false);
    await new NotificationPreferenceRepository(other.client).setPreference(
      other.id,
      "member_joined",
      false,
      false,
    );

    await user.client
      .from("notification_preferences")
      .delete()
      .eq("event_type", "member_joined")
      .in("user_id", [user.id, other.id]);

    expect(await storedPreferenceCount(user.id, "member_joined")).toBe(0);
    expect(await storedPreferenceCount(other.id, "member_joined")).toBe(1);
  });
});

describe("RLS: comment deletion follows the matrix", () => {
  let owner: TestUser;
  let viewer: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Ophélie", status: "ACTIVE" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    viewer = await createMember(dossierId, "viewer", "Victor");
  });

  it("a viewer can comment, and delete their own comment", async () => {
    const comment = await new CommentRepository(viewer.client).create(
      { dossierId, procedureId: null, content: "J'ai eu le notaire au téléphone.", mentions: [] },
      viewer.id,
    );

    await new CommentRepository(viewer.client).softDelete(comment.id);

    const { data } = await serviceRoleClient()
      .from("comments")
      .select("deleted_at")
      .eq("id", comment.id)
      .single();
    expect(data?.deleted_at).not.toBeNull();
  });

  it("a viewer cannot delete someone else's comment, but the owner can", async () => {
    const ownerComment = await new CommentRepository(owner.client).create(
      { dossierId, procedureId: null, content: "Note du titulaire.", mentions: [] },
      owner.id,
    );

    await new CommentRepository(viewer.client).softDelete(ownerComment.id);
    const { data: untouched } = await serviceRoleClient()
      .from("comments")
      .select("deleted_at")
      .eq("id", ownerComment.id)
      .single();
    expect(untouched?.deleted_at).toBeNull();

    await new CommentRepository(owner.client).softDelete(ownerComment.id);
    const { data: deleted } = await serviceRoleClient()
      .from("comments")
      .select("deleted_at")
      .eq("id", ownerComment.id)
      .single();
    expect(deleted?.deleted_at).not.toBeNull();
  });

  it("a comment cannot be edited, only deleted", async () => {
    const comment = await new CommentRepository(viewer.client).create(
      { dossierId, procedureId: null, content: "Texte d'origine.", mentions: [] },
      viewer.id,
    );

    const { error } = await viewer.client
      .from("comments")
      .update({ content: "Texte réécrit." })
      .eq("id", comment.id);

    expect(error).not.toBeNull();
  });
});

describe("account deletion", () => {
  it("is refused while the account still owns a dossier", async () => {
    const owner = await createTestUser("Diane");
    await new DossierRepository(owner.client).create({
      subjectFirstName: "Henri",
      subjectLastName: "Moreau",
      status: "PREPARATION",
    });

    expect(await new AccountRepository(owner.client).ownedDossierCount()).toBe(1);
    await expect(new AccountRepository(owner.client).deleteAccount()).rejects.toThrow();
  });

  it("goes through once no dossier is owned, and keeps the thread readable", async () => {
    const owner = await createTestUser("Théo");
    const dossier = await createActiveTestDossier(owner, "Sophie", "Roux");
    const leaver = await createMember(dossier.id, "collaborator", "Léa");

    const comment = await new CommentRepository(leaver.client).create(
      { dossierId: dossier.id, procedureId: null, content: "À bientôt.", mentions: [] },
      leaver.id,
    );

    await new AccountRepository(leaver.client).deleteAccount();

    const { data } = await serviceRoleClient()
      .from("comments")
      .select("author_id, content, deleted_at")
      .eq("id", comment.id)
      .single();

    expect(data?.author_id).toBeNull();
    expect(data?.content).toBe("");
    expect(data?.deleted_at).not.toBeNull();
  });
});

describe("database authorization invariants", () => {
  it("does not expose server-only security-definer functions to API roles", async () => {
    const functions = [
      "create_notification",
      "invoke_edge_function",
      "log_activity",
      "purge_soft_deleted",
      "resolve_notification_preference",
    ];
    const rows = await query<{ function_name: string; role_name: string; allowed: boolean }>(
      `select p.proname as function_name,
              r.rolname as role_name,
              has_function_privilege(r.oid, p.oid, 'EXECUTE') as allowed
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        cross join pg_roles r
        where n.nspname = 'public'
          and p.proname = any($1::text[])
          and r.rolname in ('anon', 'authenticated')
        order by p.proname, r.rolname`,
      [functions],
    );

    expect(rows).toHaveLength(functions.length * 2);
    expect(rows.every((row) => row.allowed === false)).toBe(true);
  });

  it("prevents a user from promoting their own profile to admin", async () => {
    const user = await createTestUser("Regular");
    const { error } = await user.client
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", user.id);
    expect(error).not.toBeNull();

    const { data } = await serviceRoleClient()
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    expect(data?.role).toBe("user");
  });

  it("prevents the sole owner from deleting or demoting their membership", async () => {
    const owner = await createTestUser("Owner invariant");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Claire",
      subjectLastName: "Martin",
      status: "PREPARATION",
    });

    const { data: membership } = await owner.client
      .from("memberships")
      .select("id")
      .eq("dossier_id", dossier.id)
      .eq("user_id", owner.id)
      .single();
    const membershipId = must(membership, "owner membership").id;

    const { error: demoteError } = await owner.client
      .from("memberships")
      .update({ role: "collaborator" })
      .eq("id", membershipId);
    const { error: deleteError } = await owner.client
      .from("memberships")
      .delete()
      .eq("id", membershipId);

    expect(demoteError).not.toBeNull();
    expect(deleteError).not.toBeNull();
  });

  it("rejects mentions of people who are not active dossier members", async () => {
    const owner = await createTestUser("Mention owner");
    const outsider = await createTestUser("Mention outsider");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Élise",
      subjectLastName: "Robert",
      status: "PREPARATION",
    });

    await expect(
      new CommentRepository(owner.client).create(
        {
          dossierId: dossier.id,
          procedureId: null,
          content: "Ce message ne doit pas sortir du dossier.",
          mentions: [outsider.id],
        },
        owner.id,
      ),
    ).rejects.toThrow();
  });

  it("removes answers that disappeared after a diagnostic branch changed", async () => {
    const owner = await createTestUser("Branch owner");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Marc",
      subjectLastName: "Faure",
      status: "PREPARATION",
    });
    const answers = new AnswerRepository(owner.client);

    await answers.save(dossier.id, {
      maritalStatus: "married",
      survivingSpouseAge: 64,
    });
    await answers.save(dossier.id, { maritalStatus: "single" });

    const persisted = await answers.listForDossier(dossier.id);
    expect(persisted.map((answer) => answer.key)).toEqual(["maritalStatus"]);
  });

  it("promotes a consented trusted contact atomically when the dossier activates", async () => {
    const owner = await createTestUser("Activation owner");
    const trusted = await createTestUser("Activation trusted");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Lucie",
      subjectLastName: "Mercier",
      status: "PREPARATION",
    });
    const service = serviceRoleClient();

    await grantMembership(dossier.id, trusted, "trusted_contact");
    await service.from("trusted_contact_designations").insert({
      dossier_id: dossier.id,
      email: trusted.email,
      future_role: "owner",
      invited_by: owner.id,
      consented_by: trusted.id,
      consented_at: new Date().toISOString(),
    });

    await new DossierRepository(owner.client).activate(dossier.id, "2026-01-15");

    const { data: memberships } = await service
      .from("memberships")
      .select("user_id, role")
      .eq("dossier_id", dossier.id);
    expect(memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_id: owner.id, role: "collaborator" }),
        expect.objectContaining({ user_id: trusted.id, role: "owner" }),
      ]),
    );

    const { count } = await service
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("dossier_id", dossier.id)
      .eq("action_type", "dossier_activated");
    expect(count).toBe(1);
  });
});
