import { beforeAll, describe, expect, it } from "vitest";
import { AdminMetricsRepository } from "#client/repositories/admin-metrics-repository";
import { CatalogHistoryRepository } from "#client/repositories/catalog-history-repository";
import { CatalogRepository } from "#client/repositories/catalog-repository";
import { ContractRepository } from "#client/repositories/contract-repository";
import { DossierRepository } from "#client/repositories/dossier-repository";
import { MembershipRepository } from "#client/repositories/membership-repository";
import { PreparationWishesRepository } from "#client/repositories/preparation-wishes-repository";
import { TrackingRepository } from "#client/repositories/tracking-repository";
import { TrustedContactRepository } from "#client/repositories/trusted-contact-repository";
import {
  anonClient,
  createActiveTestDossier,
  createTestUser,
  fetchAProcedureId,
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

describe("RLS — isolation between users", () => {
  let userA: TestUser;
  let userB: TestUser;
  let dossierAId: string;

  beforeAll(async () => {
    userA = await createTestUser("Alice");
    userB = await createTestUser("Bruno");

    const dossier = await new DossierRepository(userA.client).create({
      subjectFirstName: "John",
      subjectLastName: "Doe",
      status: "PREPARATION",
    });
    dossierAId = dossier.id;
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

describe("RLS — a viewer cannot change a status", () => {
  let owner: TestUser;
  let viewer: TestUser;
  let dossierId: string;
  let trackingId: string;

  beforeAll(async () => {
    owner = await createTestUser("Owner");
    viewer = await createTestUser("Viewer");

    const dossier = await createActiveTestDossier(owner, "Mary", "Smith");
    dossierId = dossier.id;

    await new MembershipRepository(owner.client).addMember(
      dossierId,
      viewer.id,
      "viewer",
      owner.id,
    );

    const procedureId = await fetchAProcedureId();
    const tracking = await new TrackingRepository(owner.client).createForProcedure(
      dossierId,
      procedureId,
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

describe("RLS — a trusted contact sees nothing while the dossier is in PREPARATION", () => {
  let owner: TestUser;
  let trustedContact: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    owner = await createTestUser("Preparer");
    trustedContact = await createTestUser("Trusted");

    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Paul",
      subjectLastName: "Petit",
      status: "PREPARATION",
    });
    dossierId = dossier.id;

    // Direct designation here (the full token-based flow lands in step 10): the
    // trusted_contact role is valid per the table constraint, only has_dossier_access
    // excludes it while the dossier stays in PREPARATION.
    const { error } = await owner.client.from("memberships").insert({
      dossier_id: dossierId,
      user_id: trustedContact.id,
      role: "trusted_contact",
      invited_by: owner.id,
    });
    expect(error).toBeNull();
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

describe("RLS — the catalog is publicly readable, never writable by anon", () => {
  it("anon can read procedures", async () => {
    const { data, error } = await anonClient().from("procedures").select("id").limit(1);
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
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
});

describe("RLS — only the owner updates dossier information", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    owner = await createTestUser("Owner2");
    collaborator = await createTestUser("Collab");

    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Sophie",
      subjectLastName: "Durand",
      status: "PREPARATION",
    });
    dossierId = dossier.id;

    await new MembershipRepository(owner.client).addMember(
      dossierId,
      collaborator.id,
      "collaborator",
      owner.id,
    );
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

describe("RLS — a procedure can never be assigned to a viewer", () => {
  let owner: TestUser;
  let viewer: TestUser;
  let dossierId: string;
  let trackingId: string;

  beforeAll(async () => {
    owner = await createTestUser("Owner3");
    viewer = await createTestUser("Viewer2");

    const dossier = await createActiveTestDossier(owner, "Luke", "Robert");
    dossierId = dossier.id;

    await new MembershipRepository(owner.client).addMember(
      dossierId,
      viewer.id,
      "viewer",
      owner.id,
    );

    const procedureId = await fetchAProcedureId();
    const tracking = await new TrackingRepository(owner.client).createForProcedure(
      dossierId,
      procedureId,
    );
    trackingId = tracking.id;
  });

  it("the validation trigger rejects the assignment, even attempted by the owner", async () => {
    await expect(
      new TrackingRepository(owner.client).update(trackingId, { assignedTo: viewer.id }),
    ).rejects.toThrow();
  });
});

describe("RLS — removing a member unassigns their tracking and logs the event", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;
  let trackingId: string;
  let collaboratorMembershipId: string;

  beforeAll(async () => {
    owner = await createTestUser("Owner4");
    collaborator = await createTestUser("Collab2");

    const dossier = await createActiveTestDossier(owner, "Nina", "Bernard");
    dossierId = dossier.id;

    const membership = await new MembershipRepository(owner.client).addMember(
      dossierId,
      collaborator.id,
      "collaborator",
      owner.id,
    );
    collaboratorMembershipId = membership.id;

    const procedureId = await fetchAProcedureId();
    const tracking = await new TrackingRepository(owner.client).createForProcedure(
      dossierId,
      procedureId,
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

describe("RLS — contracts require at least collaborator to write, viewer to read", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let viewer: TestUser;
  let dossierId: string;
  let contractId: string;

  beforeAll(async () => {
    owner = await createTestUser("Owner5");
    collaborator = await createTestUser("Collab3");
    viewer = await createTestUser("Viewer3");

    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Alain",
      subjectLastName: "Roux",
      status: "PREPARATION",
    });
    dossierId = dossier.id;

    await new MembershipRepository(owner.client).addMember(
      dossierId,
      collaborator.id,
      "collaborator",
      owner.id,
    );
    await new MembershipRepository(owner.client).addMember(
      dossierId,
      viewer.id,
      "viewer",
      owner.id,
    );
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
    contractId = contract.id;

    const updated = await new ContractRepository(collaborator.client).update(contractId, {
      contractType: "assurance-obseques",
      company: "Acme",
    });
    expect(updated.contractType).toBe("assurance-obseques");

    await new ContractRepository(collaborator.client).delete(contractId);
    const remaining = await new ContractRepository(owner.client).listForDossier(dossierId);
    expect(remaining.find((c) => c.id === contractId)).toBeUndefined();
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

describe("RLS — preparation wishes are owner-only to write", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;

  beforeAll(async () => {
    owner = await createTestUser("Owner6");
    collaborator = await createTestUser("Collab4");

    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Claire",
      subjectLastName: "Fontaine",
      status: "PREPARATION",
    });
    dossierId = dossier.id;

    await new MembershipRepository(owner.client).addMember(
      dossierId,
      collaborator.id,
      "collaborator",
      owner.id,
    );
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

describe("RLS — trusted contact designations are owner-only, no client insert", () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let dossierId: string;
  let designationId: string;

  beforeAll(async () => {
    owner = await createTestUser("Owner7");
    collaborator = await createTestUser("Collab5");

    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Denis",
      subjectLastName: "Lefevre",
      status: "PREPARATION",
    });
    dossierId = dossier.id;

    await new MembershipRepository(owner.client).addMember(
      dossierId,
      collaborator.id,
      "collaborator",
      owner.id,
    );

    const { error } = await owner.client
      .from("trusted_contact_designations")
      .insert({
        dossier_id: dossierId,
        email: "confiance@example.test",
        future_role: "collaborator",
        invited_by: owner.id,
      })
      .select()
      .single();
    // Direct client insert is expected to be rejected: only the designate-trusted-contact
    // Edge Function (service_role) may create a designation.
    expect(error).not.toBeNull();
  });

  it("a collaborator sees no designations even once one exists (service-role bootstrap)", async () => {
    const { data: designation, error } = await serviceRoleClient()
      .from("trusted_contact_designations")
      .insert({
        dossier_id: dossierId,
        email: "confiance@example.test",
        future_role: "collaborator",
        invited_by: owner.id,
      })
      .select()
      .single();
    expect(error).toBeNull();
    designationId = must(designation, "trusted contact designation").id;

    const asCollaborator = await new TrustedContactRepository(collaborator.client).listForDossier(
      dossierId,
    );
    expect(asCollaborator).toEqual([]);
  });

  it("the owner can see and revoke the designation", async () => {
    const asOwner = await new TrustedContactRepository(owner.client).listForDossier(dossierId);
    expect(asOwner.find((d) => d.id === designationId)).toBeDefined();

    await new TrustedContactRepository(owner.client).revoke(designationId);
    const afterRevoke = await new TrustedContactRepository(owner.client).listForDossier(dossierId);
    expect(afterRevoke.find((d) => d.id === designationId)).toBeUndefined();
  });
});

describe("RLS — only is_admin() can write the catalog, and it logs to catalog_history", () => {
  let admin: TestUser;
  let regularUser: TestUser;
  let procedureId: string;

  beforeAll(async () => {
    admin = await createTestUser("Admin1");
    await promoteToAdmin(admin.id);
    regularUser = await createTestUser("Regular1");
  });

  it("a regular user cannot create a procedure", async () => {
    await expect(
      new CatalogRepository(regularUser.client).createProcedure({
        code: `hack-${Date.now()}`,
        title: "x",
        description: "x",
        organization: "x",
        recipientAddress: null,
        timeWindow: "30d",
        delayDays: null,
        referenceProfession: null,
        sourceUrl: "https://example.com",
        lastVerifiedDate: "2026-01-01",
        active: true,
      }),
    ).rejects.toThrow();
  });

  it("an admin can create, update and delete a procedure, each logged to catalog_history", async () => {
    const created = await new CatalogRepository(admin.client).createProcedure({
      code: `admin-test-${Date.now()}`,
      title: "Démarche de test",
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
    procedureId = created.id;

    const updated = await new CatalogRepository(admin.client).updateProcedure(procedureId, {
      code: created.code,
      title: "Démarche de test modifiée",
      description: created.description,
      organization: created.organization,
      recipientAddress: null,
      timeWindow: created.timeWindow,
      delayDays: created.delayDays,
      referenceProfession: null,
      sourceUrl: created.sourceUrl,
      lastVerifiedDate: created.lastVerifiedDate,
      active: created.active,
    });
    expect(updated.title).toBe("Démarche de test modifiée");

    await new CatalogRepository(admin.client).deleteProcedure(procedureId);

    const { data: history } = await serviceRoleClient()
      .from("catalog_history")
      .select("action, modified_by")
      .eq("catalog_table", "procedures")
      .eq("row_id", procedureId)
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
    expect(history.length).toBeGreaterThan(0);
  });
});

describe("RLS — get_admin_metrics is admin-only and returns aggregates only", () => {
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
