import type { BenefitInput, ProcedureInput } from "@sorento/domain";
import type { PostgrestError } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { AdminMetricsRepository } from "#client/repositories/admin-metrics-repository";
import { AnswerRepository } from "#client/repositories/answer-repository";
import { CatalogHistoryRepository } from "#client/repositories/catalog-history-repository";
import { CatalogRepository } from "#client/repositories/catalog-repository";
import { CommentRepository } from "#client/repositories/comment-repository";
import { ContractRepository } from "#client/repositories/contract-repository";
import { DocumentRepository } from "#client/repositories/document-repository";
import { DossierRepository } from "#client/repositories/dossier-repository";
import { InvitationRepository } from "#client/repositories/invitation-repository";
import { MembershipRepository } from "#client/repositories/membership-repository";
import { PreparationWishesRepository } from "#client/repositories/preparation-wishes-repository";
import { ProfileRepository } from "#client/repositories/profile-repository";
import { TrackingRepository } from "#client/repositories/tracking-repository";
import { TrustedContactRepository } from "#client/repositories/trusted-contact-repository";
import {
  anonClient,
  createMember,
  createOwnedDossier,
  createTestUser,
  fetchAProcedureId,
  grantMembership,
  must,
  serviceRoleClient,
  type TestUser,
} from "#client/integration-tests/helpers";

const promoteToAdmin = async (userId: string): Promise<void> => {
  const { error } = await serviceRoleClient()
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);
  if (error) throw error;
};

// Integration tests against a real local Supabase instance (`supabase start`). Validates
// the permission matrix from CLAUDE.md section 5.2, not just application code: an
// untested policy is an assumed policy.

describe("RLS: isolation between users", () => {
  let userA: TestUser;
  let userB: TestUser;
  let dossierAId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Alice", status: "PREPARATION" });
    userA = fixture.owner;
    dossierAId = fixture.dossierId;
    userB = await createTestUser("Bruno");
  });

  it("user B cannot read user A's dossier when not a member", async () => {
    const dossierRepoB = new DossierRepository(userB.client);

    await expect(dossierRepoB.getById(dossierAId)).resolves.toBeNull();
    const dossiersOfB = await dossierRepoB.listForCurrentUser();
    expect(dossiersOfB.find((d) => d.id === dossierAId)).toBeUndefined();
  });

  it("the owner does see their own dossier", async () => {
    const dossier = await new DossierRepository(userA.client).getById(dossierAId);
    expect(dossier?.id).toBe(dossierAId);
  });
});

describe("RLS: a viewer cannot change a status", () => {
  let owner: TestUser;
  let viewer: TestUser;
  let dossierId: string;
  let trackingId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner", status: "ACTIVE" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    viewer = await createMember(dossierId, "viewer", "Viewer");

    const tracking = await new TrackingRepository(owner.client).createForProcedure(
      dossierId,
      await fetchAProcedureId(),
    );
    trackingId = tracking.id;
  });

  it("the viewer sees the tracking entry but cannot update it", async () => {
    const trackingRepoViewer = new TrackingRepository(viewer.client);

    const list = await trackingRepoViewer.listForDossier(dossierId);
    expect(list.some((t) => t.id === trackingId)).toBe(true);

    await expect(trackingRepoViewer.update(trackingId, { status: "done" })).rejects.toThrow();
  });

  it("the owner can change the status", async () => {
    const tracking = await new TrackingRepository(owner.client).update(trackingId, {
      status: "in_progress",
    });
    expect(tracking.status).toBe("in_progress");
  });
});

describe("RLS: a trusted contact sees nothing while the dossier is in PREPARATION", () => {
  let trustedContact: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Preparer", status: "PREPARATION" });
    dossierId = fixture.dossierId;
    // The designation goes through its own token flow in production. What matters here is that
    // the trusted_contact role is valid per the table constraint: only has_dossier_access
    // excludes it while the dossier stays in PREPARATION.
    trustedContact = await createMember(dossierId, "trusted_contact", "Trusted");
  });

  it("cannot see the dossier", async () => {
    const dossier = await new DossierRepository(trustedContact.client).getById(dossierId);
    expect(dossier).toBeNull();

    const dossiers = await new DossierRepository(trustedContact.client).listForCurrentUser();
    expect(dossiers).toEqual([]);
  });

  it("cannot see the member list", async () => {
    const members = await new MembershipRepository(trustedContact.client).listForDossier(dossierId);
    expect(members).toEqual([]);
  });
});

describe("RLS: the catalog is publicly readable, never writable by anon", () => {
  it("anon can read procedures", async () => {
    const { data, error } = await anonClient().from("procedures").select("id").limit(1);
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  // The anonymous diagnostic runs the whole rules engine before anyone signs up: benefits and
  // their conditions have to be readable without a session, or it computes nothing.
  it("anon can read benefits, conditions and letter templates", async () => {
    const anon = anonClient();

    const benefits = await anon.from("benefits").select("id").limit(1);
    const conditions = await anon.from("conditions").select("id").limit(1);
    const templates = await anon.from("letter_templates").select("id").limit(1);

    expect(benefits.error).toBeNull();
    expect(conditions.error).toBeNull();
    expect(templates.error).toBeNull();
    expect(benefits.data?.length).toBeGreaterThan(0);
    expect(conditions.data?.length).toBeGreaterThan(0);
    expect(templates.data?.length).toBeGreaterThan(0);
  });

  it("anon cannot write to the catalog", async () => {
    const { error } = await anonClient()
      .from("procedures")
      .insert({
        code: `hack-${Date.now()}`,
        title: "x",
        description: "x",
        organization: "x",
        time_window: "24h",
        source_url: "https://example.com",
        last_verified_date: "2026-01-01",
      });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("anon cannot write a benefit or a letter template either", async () => {
    const anon = anonClient();

    const benefit = await anon.from("benefits").insert({
      code: `hack-${Date.now()}`,
      title: "x",
      main_condition: "x",
      organization: "x",
      form_url: "https://example.com",
      caution_text: "x",
      time_window: "24h",
      source_url: "https://example.com",
      last_verified_date: "2026-01-01",
    });
    const template = await anon.from("letter_templates").insert({
      procedure_id: await fetchAProcedureId(),
      title: "x",
      body_template: "x",
      last_verified_date: "2026-01-01",
    });

    expect(benefit.error?.code).toBe("42501");
    expect(template.error?.code).toBe("42501");
  });
});

describe("RLS: only the owner updates dossier information", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner2", status: "PREPARATION" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    collaborator = await createMember(dossierId, "collaborator", "Collab");
  });

  it("the collaborator cannot update dossier information", async () => {
    await expect(
      new DossierRepository(collaborator.client).updateInfo(dossierId, { subjectLastName: "Hack" }),
    ).rejects.toThrow();
  });

  it("the owner can update dossier information", async () => {
    const dossier = await new DossierRepository(owner.client).updateInfo(dossierId, {
      subjectLastName: "Durand-Martin",
    });
    expect(dossier.subjectLastName).toBe("Durand-Martin");
  });
});

// Fixtures elsewhere create memberships with service_role on purpose (see grantMembership).
// This describe is where the permission to add one is actually asserted, through the clients
// that would exercise it in the app.
describe("RLS: only the owner may add a member", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let refused: TestUser;
  let accepted: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner8", status: "PREPARATION" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    collaborator = await createMember(dossierId, "collaborator", "Collab6");
    refused = await createTestUser("Refused");
    accepted = await createTestUser("Accepted");
  });

  it("a collaborator cannot bring someone in", async () => {
    await expect(
      new MembershipRepository(collaborator.client).addMember(
        dossierId,
        refused.id,
        "viewer",
        collaborator.id,
      ),
    ).rejects.toThrow();

    const members = await new MembershipRepository(owner.client).listForDossier(dossierId);
    expect(members.find((m) => m.userId === refused.id)).toBeUndefined();
  });

  it("the owner can", async () => {
    const membership = await new MembershipRepository(owner.client).addMember(
      dossierId,
      accepted.id,
      "viewer",
      owner.id,
    );
    expect(membership.role).toBe("viewer");
  });
});

describe("RLS: a procedure can never be assigned to a viewer", () => {
  let owner: TestUser;
  let viewer: TestUser;
  let trackingId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner3", status: "ACTIVE" });
    owner = fixture.owner;
    viewer = await createMember(fixture.dossierId, "viewer", "Viewer2");

    const tracking = await new TrackingRepository(owner.client).createForProcedure(
      fixture.dossierId,
      await fetchAProcedureId(),
    );
    trackingId = tracking.id;
  });

  it("the validation trigger rejects the assignment, even attempted by the owner", async () => {
    await expect(
      new TrackingRepository(owner.client).update(trackingId, { assignedTo: viewer.id }),
    ).rejects.toThrow();
  });
});

describe("RLS: removing a member unassigns their tracking and logs the event", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;
  let trackingId: string;
  let collaboratorMembershipId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner4", status: "ACTIVE" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    collaborator = await createTestUser("Collab2");
    collaboratorMembershipId = await grantMembership(dossierId, collaborator, "collaborator");

    const tracking = await new TrackingRepository(owner.client).createForProcedure(
      dossierId,
      await fetchAProcedureId(),
    );
    trackingId = tracking.id;

    await new TrackingRepository(owner.client).update(trackingId, { assignedTo: collaborator.id });
  });

  it("after removal, tracking goes back to unassigned and an activity_log entry exists", async () => {
    await new MembershipRepository(owner.client).removeMember(collaboratorMembershipId);

    const tracking = await new TrackingRepository(owner.client).listForDossier(dossierId);
    const entry = tracking.find((t) => t.id === trackingId);
    expect(entry?.assignedTo).toBeNull();

    const { data: activityLog, error } = await owner.client
      .from("activity_log")
      .select()
      .eq("dossier_id", dossierId)
      .eq("action_type", "member_removed");

    expect(error).toBeNull();
    expect(activityLog?.length).toBeGreaterThan(0);
  });
});

describe("RLS: contracts require at least collaborator to write, viewer to read", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let viewer: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner5", status: "PREPARATION" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    collaborator = await createMember(dossierId, "collaborator", "Collab3");
    viewer = await createMember(dossierId, "viewer", "Viewer3");
  });

  it("a viewer cannot create a contract", async () => {
    await expect(
      new ContractRepository(viewer.client).create(dossierId, {
        contractType: "assurance-vie",
        company: "Acme",
      }),
    ).rejects.toThrow();
  });

  it("a collaborator can create, update and delete a contract", async () => {
    const contract = await new ContractRepository(collaborator.client).create(dossierId, {
      contractType: "assurance-vie",
      company: "Acme",
    });

    const updated = await new ContractRepository(collaborator.client).update(contract.id, {
      contractType: "assurance-obseques",
      company: "Acme",
    });
    expect(updated.contractType).toBe("assurance-obseques");

    await new ContractRepository(collaborator.client).delete(contract.id);
    const remaining = await new ContractRepository(owner.client).listForDossier(dossierId);
    expect(remaining.find((c) => c.id === contract.id)).toBeUndefined();
  });

  it("a viewer can read the contract list", async () => {
    await new ContractRepository(owner.client).create(dossierId, {
      contractType: "mutuelle",
      company: "Beta",
    });
    const contracts = await new ContractRepository(viewer.client).listForDossier(dossierId);
    expect(contracts.length).toBeGreaterThan(0);
  });
});

describe("RLS: preparation wishes are owner-only to write", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner6", status: "PREPARATION" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    collaborator = await createMember(dossierId, "collaborator", "Collab4");
  });

  it("a collaborator cannot save wishes", async () => {
    await expect(
      new PreparationWishesRepository(collaborator.client).upsert(dossierId, {
        funeralWishes: "hack",
      }),
    ).rejects.toThrow();
  });

  it("the owner can save wishes and a collaborator can read them", async () => {
    const wishes = await new PreparationWishesRepository(owner.client).upsert(dossierId, {
      funeralWishes: "Crémation, musique de Bach",
    });
    expect(wishes.funeralWishes).toBe("Crémation, musique de Bach");

    const read = await new PreparationWishesRepository(collaborator.client).getForDossier(
      dossierId,
    );
    expect(read?.funeralWishes).toBe("Crémation, musique de Bach");
  });
});

describe("RLS: diagnostic answers are written by the owner alone", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let viewer: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner9", status: "PREPARATION" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    collaborator = await createMember(dossierId, "collaborator", "Collab7");
    viewer = await createMember(dossierId, "viewer", "Viewer4");
  });

  it("the owner saves the answers and every member reads them", async () => {
    await new AnswerRepository(owner.client).save(dossierId, { maritalStatus: "married" });

    const asViewer = await new AnswerRepository(viewer.client).listForDossier(dossierId);
    expect(asViewer.map((answer) => answer.key)).toEqual(["maritalStatus"]);
  });

  it("a collaborator cannot save answers", async () => {
    await expect(
      new AnswerRepository(collaborator.client).save(dossierId, { maritalStatus: "single" }),
    ).rejects.toThrow();
  });

  // The repository only ever writes through sync_diagnostic_answers, which checks ownership
  // itself. The table policy has to refuse the same write on its own, or the RPC is the only
  // thing standing between a collaborator and the answer set.
  it("a collaborator cannot insert an answer row directly", async () => {
    const { error } = await collaborator.client
      .from("answers")
      .insert({ dossier_id: dossierId, key: "hack", value: "hack" });

    expect(error?.code).toBe("42501");
  });

  it("a collaborator cannot rewrite an answer the owner saved", async () => {
    await new AnswerRepository(owner.client).save(dossierId, { maritalStatus: "married" });

    await collaborator.client
      .from("answers")
      .update({ value: "single" })
      .eq("dossier_id", dossierId)
      .eq("key", "maritalStatus");

    const { data } = await serviceRoleClient()
      .from("answers")
      .select("value")
      .eq("dossier_id", dossierId)
      .eq("key", "maritalStatus")
      .single();
    expect(must(data, "marital status answer").value).toBe("married");
  });
});

describe("RLS: a profile is readable by co-members only", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let trustedContact: TestUser;
  let stranger: TestUser;

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner10", status: "PREPARATION" });
    owner = fixture.owner;
    collaborator = await createMember(fixture.dossierId, "collaborator", "Collab8");
    trustedContact = await createMember(fixture.dossierId, "trusted_contact", "Trusted2");
    stranger = await createTestUser("Stranger");
  });

  it("a co-member reads the profile, which is what puts a name on a comment", async () => {
    const profiles = await new ProfileRepository(collaborator.client).listByIds([owner.id]);
    expect(profiles.map((profile) => profile.id)).toEqual([owner.id]);
  });

  it("a stranger reads their own profile and no one else's", async () => {
    const profiles = await new ProfileRepository(stranger.client).listByIds([
      owner.id,
      stranger.id,
    ]);
    expect(profiles.map((profile) => profile.id)).toEqual([stranger.id]);
  });

  // The co-membership join restricts both sides to viewer, collaborator and owner. A trusted
  // contact shares a membership row with the owner and would otherwise pass the EXISTS, which
  // is exactly the leak the role list prevents while the dossier is in PREPARATION.
  it("a trusted contact does not count as a co-member", async () => {
    const profiles = await new ProfileRepository(trustedContact.client).listByIds([owner.id]);
    expect(profiles).toEqual([]);
  });

  // Reading a co-member's profile and rewriting it are different permissions: the second one
  // stops at yourself, or a member could rename anyone else in the space.
  it("a member renames themselves and nobody else", async () => {
    const renamed = await new ProfileRepository(collaborator.client).updateSelf(collaborator.id, {
      firstName: "Camille",
    });
    expect(renamed.firstName).toBe("Camille");

    await expect(
      new ProfileRepository(collaborator.client).updateSelf(owner.id, { firstName: "Usurpé" }),
    ).rejects.toThrow();
  });
});

describe("RLS: documents are written by collaborators and read by every member", () => {
  let owner: TestUser;
  let author: TestUser;
  let otherCollaborator: TestUser;
  let viewer: TestUser;
  let outsider: TestUser;
  let dossierId: string;

  /**
   * The repository writes to Storage before it writes the row, so a Storage refusal would
   * answer for the table policy under test and prove nothing about it. These cases insert the
   * row upload() would have inserted; the full path through Storage has its own test below.
   */
  const attachDocumentAs = async (
    user: TestUser,
    addedBy: string,
  ): Promise<{ data: { id: string } | null; error: PostgrestError | null }> =>
    user.client
      .from("documents")
      .insert({
        dossier_id: dossierId,
        category: "acte-de-deces",
        storage_path: `${dossierId}/acte-de-deces/${crypto.randomUUID()}.pdf`,
        original_name: "acte.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        added_by: addedBy,
      })
      .select("id")
      .maybeSingle();

  const readDeletedAt = async (documentId: string): Promise<string | null> => {
    const { data } = await serviceRoleClient()
      .from("documents")
      .select("deleted_at")
      .eq("id", documentId)
      .single();
    return must(data, "document").deleted_at;
  };

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner11", status: "ACTIVE" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    author = await createMember(dossierId, "collaborator", "Author");
    otherCollaborator = await createMember(dossierId, "collaborator", "Collab9");
    viewer = await createMember(dossierId, "viewer", "Viewer5");
    outsider = await createTestUser("Outsider");
  });

  // 42501 rather than any error at all: a check constraint refusing the row would satisfy
  // "the write failed" while proving nothing about who is allowed to write it.
  it("a viewer cannot attach a document", async () => {
    const { error } = await attachDocumentAs(viewer, viewer.id);
    expect(error?.code).toBe("42501");
  });

  // added_by is what the soft-delete policy trusts to decide who may remove a document, so a
  // row attributed to someone else is a permission handed to them without their knowledge.
  it("a collaborator cannot attribute a document to someone else", async () => {
    const { error } = await attachDocumentAs(author, owner.id);
    expect(error?.code).toBe("42501");
  });

  it("a collaborator attaches a document and every member sees it", async () => {
    const { data } = await attachDocumentAs(author, author.id);
    const documentId = must(data, "attached document").id;

    const asViewer = await new DocumentRepository(viewer.client).listForDossier(dossierId);
    expect(asViewer.map((document) => document.id)).toContain(documentId);
  });

  it("someone outside the dossier sees no document at all", async () => {
    await attachDocumentAs(author, author.id);

    const asOutsider = await new DocumentRepository(outsider.client).listForDossier(dossierId);
    expect(asOutsider).toEqual([]);
  });

  // The update policy denies by matching no row, which returns no error. Only reading the row
  // back distinguishes a refusal from a deletion that silently went through.
  it("a viewer cannot remove a document", async () => {
    const { data } = await attachDocumentAs(author, author.id);
    const documentId = must(data, "attached document").id;

    await new DocumentRepository(viewer.client).softDelete(documentId);

    expect(await readDeletedAt(documentId)).toBeNull();
  });

  it("a collaborator cannot remove a document someone else added", async () => {
    const { data } = await attachDocumentAs(author, author.id);
    const documentId = must(data, "attached document").id;

    await new DocumentRepository(otherCollaborator.client).softDelete(documentId);

    expect(await readDeletedAt(documentId)).toBeNull();
  });

  it("the author removes their own document and it leaves the list", async () => {
    const { data } = await attachDocumentAs(author, author.id);
    const documentId = must(data, "attached document").id;

    await new DocumentRepository(author.client).softDelete(documentId);

    expect(await readDeletedAt(documentId)).not.toBeNull();
    const remaining = await new DocumentRepository(author.client).listForDossier(dossierId);
    expect(remaining.map((document) => document.id)).not.toContain(documentId);
  });

  it("the owner removes a document they did not add", async () => {
    const { data } = await attachDocumentAs(author, author.id);
    const documentId = must(data, "attached document").id;

    await new DocumentRepository(owner.client).softDelete(documentId);

    expect(await readDeletedAt(documentId)).not.toBeNull();
  });

  // The bucket policies mirror has_dossier_access through the first path segment. Nothing else
  // checks that the row and the file agree on who may reach them.
  it("a collaborator uploads a file a viewer can open and an outsider cannot", async () => {
    const file = new File([new Uint8Array([37, 80, 68, 70])], "acte.pdf", {
      type: "application/pdf",
    });
    const document = await new DocumentRepository(author.client).upload(
      dossierId,
      "acte-de-deces",
      file,
      author.id,
    );

    await expect(
      new DocumentRepository(viewer.client).getSignedUrl(document.storagePath),
    ).resolves.toContain("/documents/");
    await expect(
      new DocumentRepository(outsider.client).getSignedUrl(document.storagePath),
    ).rejects.toThrow();
  });
});

describe("RLS: invitations are the owner's business alone", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;

  // invite-member (service_role) is the only thing that ever creates one: the raw token has to
  // stay out of the client, so this is the production path rather than a shortcut around it.
  const seedInvitation = async (): Promise<string> => {
    const { data, error } = await serviceRoleClient()
      .from("invitations")
      .insert({
        dossier_id: dossierId,
        email: `invite-${crypto.randomUUID()}@example.test`,
        role: "viewer",
        token_hash: crypto.randomUUID(),
        invited_by: owner.id,
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return must(data, "seeded invitation").id;
  };

  const readRevokedAt = async (invitationId: string): Promise<string | null> => {
    const { data } = await serviceRoleClient()
      .from("invitations")
      .select("revoked_at")
      .eq("id", invitationId)
      .single();
    return must(data, "invitation").revoked_at;
  };

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner12", status: "PREPARATION" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    collaborator = await createMember(dossierId, "collaborator", "Collab10");
  });

  it("nobody creates one from a client, the owner included", async () => {
    const { error } = await owner.client.from("invitations").insert({
      dossier_id: dossierId,
      email: "forged@example.test",
      role: "viewer",
      token_hash: crypto.randomUUID(),
      invited_by: owner.id,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    expect(error?.code).toBe("42501");
  });

  it("the owner lists a pending invitation and a collaborator sees none", async () => {
    const invitationId = await seedInvitation();

    const asOwner = await new InvitationRepository(owner.client).listPendingForDossier(dossierId);
    const asCollaborator = await new InvitationRepository(
      collaborator.client,
    ).listPendingForDossier(dossierId);

    expect(asOwner.map((invitation) => invitation.id)).toContain(invitationId);
    expect(asCollaborator).toEqual([]);
  });

  it("a collaborator cannot revoke one", async () => {
    const invitationId = await seedInvitation();

    await new InvitationRepository(collaborator.client).revoke(invitationId);

    expect(await readRevokedAt(invitationId)).toBeNull();
  });

  it("the owner revokes one and it leaves the pending list", async () => {
    const invitationId = await seedInvitation();

    await new InvitationRepository(owner.client).revoke(invitationId);

    expect(await readRevokedAt(invitationId)).not.toBeNull();
    const pending = await new InvitationRepository(owner.client).listPendingForDossier(dossierId);
    expect(pending.map((invitation) => invitation.id)).not.toContain(invitationId);
  });
});

describe("RLS: trusted contact designations are owner-only, never client-created", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;

  // Only the designate-trusted-contact Edge Function (service_role) may create a designation,
  // so a test that needs one to already exist builds it the way production does. A dossier
  // holds a single live designation, which is why that path is a revoke followed by a
  // designate rather than a second insert.
  const seedDesignation = async (): Promise<string> => {
    await serviceRoleClient()
      .from("trusted_contact_designations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("dossier_id", dossierId)
      .is("revoked_at", null);

    const { data, error } = await serviceRoleClient()
      .from("trusted_contact_designations")
      .insert({
        dossier_id: dossierId,
        email: `confiance-${crypto.randomUUID()}@example.test`,
        future_role: "collaborator",
        invited_by: owner.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    return must(data, "seeded trusted contact designation").id;
  };

  beforeAll(async () => {
    const fixture = await createOwnedDossier({ ownerName: "Owner7", status: "PREPARATION" });
    owner = fixture.owner;
    dossierId = fixture.dossierId;
    collaborator = await createMember(dossierId, "collaborator", "Collab5");
  });

  it("the owner cannot create a designation from their own client", async () => {
    const { error } = await owner.client.from("trusted_contact_designations").insert({
      dossier_id: dossierId,
      email: "confiance@example.test",
      future_role: "collaborator",
      invited_by: owner.id,
    });

    expect(error?.code).toBe("42501");
  });

  it("a collaborator sees no designation, even once one exists", async () => {
    await seedDesignation();

    const asCollaborator = await new TrustedContactRepository(collaborator.client).listForDossier(
      dossierId,
    );
    expect(asCollaborator).toEqual([]);
  });

  it("the owner can see and revoke the designation", async () => {
    const designationId = await seedDesignation();

    const asOwner = await new TrustedContactRepository(owner.client).listForDossier(dossierId);
    expect(asOwner.find((d) => d.id === designationId)).toBeDefined();

    await new TrustedContactRepository(owner.client).revoke(designationId);
    const afterRevoke = await new TrustedContactRepository(owner.client).listForDossier(dossierId);
    expect(afterRevoke.find((d) => d.id === designationId)).toBeUndefined();
  });
});

describe("RLS: only is_admin() can write the catalog, and it logs to catalog_history", () => {
  let admin: TestUser;
  let regularUser: TestUser;
  let loggedProcedureId: string;

  const procedureInput = (code: string, title: string): ProcedureInput => ({
    code,
    title,
    description: "Description",
    organization: "Organisme",
    recipientAddress: null,
    timeWindow: "30d",
    delayDays: 30,
    referenceProfession: null,
    sourceUrl: "https://example.com",
    lastVerifiedDate: "2026-01-01",
    active: true,
  });

  beforeAll(async () => {
    admin = await createTestUser("Admin1");
    await promoteToAdmin(admin.id);
    regularUser = await createTestUser("Regular1");

    // catalog_history only ever fills through the trigger on a catalog write. Without one
    // having happened, "a regular user reads nothing" would pass against an empty table and
    // prove nothing at all.
    const catalog = new CatalogRepository(admin.client);
    const seeded = await catalog.createProcedure(
      procedureInput(`history-seed-${Date.now()}`, "Démarche journalisée"),
    );
    loggedProcedureId = seeded.id;
    await catalog.deleteProcedure(loggedProcedureId);
  });

  it("a regular user cannot create a procedure", async () => {
    await expect(
      new CatalogRepository(regularUser.client).createProcedure(
        procedureInput(`hack-${Date.now()}`, "x"),
      ),
    ).rejects.toThrow();
  });

  it("an admin can create, update and delete a procedure, each logged to catalog_history", async () => {
    const catalog = new CatalogRepository(admin.client);
    const created = await catalog.createProcedure(
      procedureInput(`admin-test-${Date.now()}`, "Démarche de test"),
    );

    const updated = await catalog.updateProcedure(
      created.id,
      procedureInput(created.code, "Démarche de test modifiée"),
    );
    expect(updated.title).toBe("Démarche de test modifiée");

    await catalog.deleteProcedure(created.id);

    const { data: history } = await serviceRoleClient()
      .from("catalog_history")
      .select("action, modified_by")
      .eq("catalog_table", "procedures")
      .eq("row_id", created.id)
      .order("created_at", { ascending: true });

    expect(history?.map((h) => h.action)).toEqual(["created", "updated", "deleted"]);
    expect(history?.every((h) => h.modified_by === admin.id)).toBe(true);
  });

  it("a regular user cannot read catalog_history", async () => {
    const history = await new CatalogHistoryRepository(regularUser.client).listRecent();
    expect(history).toEqual([]);
  });

  it("an admin can read catalog_history", async () => {
    const history = await new CatalogHistoryRepository(admin.client).listRecent();
    expect(history.some((entry) => entry.rowId === loggedProcedureId)).toBe(true);
  });
});

describe("RLS: benefits, conditions and letter templates are admin-only to write", () => {
  let admin: TestUser;
  let regularUser: TestUser;
  let procedureId: string;

  const benefitInput = (code: string, title: string): BenefitInput => ({
    code,
    title,
    mainCondition: "Condition principale",
    estimatedAmount: null,
    organization: "Organisme",
    formUrl: "https://example.com",
    cautionText: "Les personnes dans une situation comme la vôtre peuvent y avoir droit.",
    timeWindow: "30d",
    sourceUrl: "https://example.com",
    lastVerifiedDate: "2026-01-01",
    active: true,
  });

  beforeAll(async () => {
    admin = await createTestUser("Admin3");
    await promoteToAdmin(admin.id);
    regularUser = await createTestUser("Regular3");
    procedureId = await fetchAProcedureId();
  });

  it("a regular user cannot create a benefit", async () => {
    await expect(
      new CatalogRepository(regularUser.client).createBenefit(
        benefitInput(`hack-benefit-${Date.now()}`, "x"),
      ),
    ).rejects.toThrow();
  });

  it("an admin can create, update and delete a benefit", async () => {
    const catalog = new CatalogRepository(admin.client);
    const created = await catalog.createBenefit(
      benefitInput(`admin-benefit-${Date.now()}`, "Aide de test"),
    );

    const updated = await catalog.updateBenefit(
      created.id,
      benefitInput(created.code, "Aide de test modifiée"),
    );
    expect(updated.title).toBe("Aide de test modifiée");

    await catalog.deleteBenefit(created.id);
    const remaining = await catalog.listAllBenefits();
    expect(remaining.find((benefit) => benefit.id === created.id)).toBeUndefined();
  });

  it("a regular user cannot create a letter template", async () => {
    await expect(
      new CatalogRepository(regularUser.client).createLetterTemplate({
        procedureId,
        title: "x",
        bodyTemplate: "x",
        variables: [],
        sourceUrl: null,
        lastVerifiedDate: "2026-01-01",
      }),
    ).rejects.toThrow();
  });

  it("an admin can create, update and delete a letter template", async () => {
    const catalog = new CatalogRepository(admin.client);
    const created = await catalog.createLetterTemplate({
      procedureId,
      title: "Modèle de test",
      bodyTemplate: "Madame, Monsieur,",
      variables: [],
      sourceUrl: null,
      lastVerifiedDate: "2026-01-01",
    });

    const updated = await catalog.updateLetterTemplate(created.id, {
      procedureId,
      title: "Modèle de test modifié",
      bodyTemplate: "Madame, Monsieur,",
      variables: [],
      sourceUrl: null,
      lastVerifiedDate: "2026-01-01",
    });
    expect(updated.title).toBe("Modèle de test modifié");

    await catalog.deleteLetterTemplate(created.id);
    const remaining = await catalog.listLetterTemplates(procedureId);
    expect(remaining.find((template) => template.id === created.id)).toBeUndefined();
  });

  it("a regular user cannot create a condition", async () => {
    await expect(
      new CatalogRepository(regularUser.client).createCondition({
        procedureId,
        benefitId: null,
        expression: {
          type: "comparison",
          field: "maritalStatus",
          operator: "eq",
          value: "married",
        },
      }),
    ).rejects.toThrow();
  });

  it("an admin can create and delete a condition", async () => {
    const catalog = new CatalogRepository(admin.client);
    const created = await catalog.createCondition({
      procedureId,
      benefitId: null,
      expression: {
        type: "comparison",
        field: "maritalStatus",
        operator: "eq",
        value: "married",
      },
    });

    await catalog.deleteCondition(created.id);
    const remaining = await catalog.listConditions();
    expect(remaining.find((condition) => condition.id === created.id)).toBeUndefined();
  });
});

describe("RLS: get_admin_metrics is admin-only and returns aggregates only", () => {
  it("a regular user is rejected", async () => {
    const regularUser = await createTestUser("Regular2");
    await expect(new AdminMetricsRepository(regularUser.client).get()).rejects.toThrow();
  });

  it("an admin receives aggregate counts", async () => {
    const admin = await createTestUser("Admin2");
    await promoteToAdmin(admin.id);

    const metrics = await new AdminMetricsRepository(admin.client).get();
    expect(metrics.totalUsers).toBeGreaterThan(0);
    expect(typeof metrics.totalDossiers).toBe("number");
    expect(typeof metrics.trackingCompletionRatePercent).toBe("number");
  });
});

describe("RLS: the platform admin has no access to users' dossiers", () => {
  let admin: TestUser;
  let owner: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    admin = await createTestUser("AdminIsolation");
    await promoteToAdmin(admin.id);
    owner = await createTestUser("OwnerIsolation");

    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Jeanne",
      subjectLastName: "Martin",
      status: "PREPARATION",
    });
    dossierId = dossier.id;

    const procedureId = await fetchAProcedureId();
    await new TrackingRepository(owner.client).createForProcedure(dossierId, procedureId);
    const service = serviceRoleClient();
    const { error: commentError } = await service.from("comments").insert({
      dossier_id: dossierId,
      author_id: owner.id,
      content: "visible aux membres seulement",
    });
    if (commentError) throw commentError;
    const { error: documentError } = await service.from("documents").insert({
      dossier_id: dossierId,
      category: "administratif",
      storage_path: `${dossierId}/administratif/${crypto.randomUUID()}.pdf`,
      original_name: "attestation.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
      added_by: owner.id,
    });
    if (documentError) throw documentError;
  });

  it("the owner sees the seeded content, so the admin assertions below are not vacuous", async () => {
    expect(await new TrackingRepository(owner.client).listForDossier(dossierId)).not.toHaveLength(
      0,
    );
    expect(await new CommentRepository(owner.client).listForDossier(dossierId)).not.toHaveLength(0);
    expect(await new DocumentRepository(owner.client).listForDossier(dossierId)).not.toHaveLength(
      0,
    );
  });

  it("the admin reads neither the dossier nor its tracking, comments or documents", async () => {
    await expect(new DossierRepository(admin.client).getById(dossierId)).resolves.toBeNull();
    expect(await new TrackingRepository(admin.client).listForDossier(dossierId)).toHaveLength(0);
    expect(await new CommentRepository(admin.client).listForDossier(dossierId)).toHaveLength(0);
    expect(await new DocumentRepository(admin.client).listForDossier(dossierId)).toHaveLength(0);
  });
});
