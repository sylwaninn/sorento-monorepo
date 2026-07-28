import { beforeAll, describe, expect, it } from "vitest";
import { AccountRepository } from "#client/repositories/account-repository";
import { CommentRepository } from "#client/repositories/comment-repository";
import { DossierRepository } from "#client/repositories/dossier-repository";
import { MembershipRepository } from "#client/repositories/membership-repository";
import { TrackingRepository } from "#client/repositories/tracking-repository";
import {
  createTestUser,
  fetchAProcedureId,
  must,
  serviceRoleClient,
  type TestUser,
} from "#client/integration-tests/helpers";

// Covers the policies added by the hardening migrations. Each of these was a real hole:
// a forgeable audit trail, a bin that revoked nothing, notifications readable by anyone,
// and a creator who kept access forever.

const addCollaborator = async (dossierId: string, user: TestUser): Promise<string> => {
  const { data, error } = await serviceRoleClient()
    .from("memberships")
    .insert({ dossier_id: dossierId, user_id: user.id, role: "collaborator" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`failed to add collaborator: ${error?.message}`);
  return data.id;
};

describe("RLS — the activity log cannot be written by a client", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    owner = await createTestUser("Olivia");
    collaborator = await createTestUser("Colin");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Jean",
      subjectLastName: "Durand",
      status: "ACTIVE",
    });
    dossierId = dossier.id;
    await addCollaborator(dossierId, collaborator);
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

describe("RLS — a soft-deleted dossier revokes access to its content", () => {
  let owner: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    owner = await createTestUser("Oscar");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Marie",
      subjectLastName: "Petit",
      status: "ACTIVE",
    });
    dossierId = dossier.id;
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

  it("and so does the ability to write to them", async () => {
    const { error } = await owner.client
      .from("comments")
      .insert({ dossier_id: dossierId, author_id: owner.id, content: "après suppression" });

    expect(error).not.toBeNull();
  });
});

describe("RLS — creating a dossier does not grant permanent access", () => {
  it("the previous owner loses the dossier once ownership moves on", async () => {
    const creator = await createTestUser("Camille");
    const successor = await createTestUser("Sacha");

    const dossier = await new DossierRepository(creator.client).create({
      subjectFirstName: "Paul",
      subjectLastName: "Girard",
      status: "PREPARATION",
    });
    await addCollaborator(dossier.id, successor);
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

describe("RLS — notifications are strictly personal", () => {
  it("a member never reads another member's notifications", async () => {
    const owner = await createTestUser("Noa");
    const other = await createTestUser("Nina");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Luc",
      subjectLastName: "Bernard",
      status: "ACTIVE",
    });
    await addCollaborator(dossier.id, other);

    await serviceRoleClient().from("notifications").insert({
      user_id: owner.id,
      dossier_id: dossier.id,
      type: "mention",
      target_id: null,
      payload: {},
    });

    const { data: seenByOther } = await other.client
      .from("notifications")
      .select("id")
      .eq("dossier_id", dossier.id)
      .eq("type", "mention");
    const { data: seenByOwner } = await owner.client
      .from("notifications")
      .select("id")
      .eq("dossier_id", dossier.id)
      .eq("type", "mention");

    expect(seenByOther).toEqual([]);
    expect(seenByOwner?.length).toBe(1);
  });
});

describe("RLS — comment deletion follows the matrix", () => {
  let owner: TestUser;
  let viewer: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    owner = await createTestUser("Ophélie");
    viewer = await createTestUser("Victor");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Anne",
      subjectLastName: "Leroy",
      status: "ACTIVE",
    });
    dossierId = dossier.id;
    await serviceRoleClient()
      .from("memberships")
      .insert({ dossier_id: dossierId, user_id: viewer.id, role: "viewer" });
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
    const leaver = await createTestUser("Léa");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Sophie",
      subjectLastName: "Roux",
      status: "ACTIVE",
    });
    await addCollaborator(dossier.id, leaver);

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
