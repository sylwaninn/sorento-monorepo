import { describe, expect, it } from "vitest";
import type { DossierRole } from "@sorento/domain";
import { can, isAssignable, type DossierAction } from "#core/permissions";

// Transcription of the specification matrix. Kept as data so a policy change has to be made
// here as well as in the migration, and the divergence shows up as a failing test.
const MATRIX: Record<DossierAction, readonly DossierRole[]> = {
  "dossier:view": ["owner", "collaborator", "viewer"],
  "dossier:update": ["owner"],
  "dossier:delete": ["owner"],
  "answers:view": ["owner", "collaborator", "viewer"],
  "answers:update": ["owner"],
  "tracking:view": ["owner", "collaborator", "viewer"],
  "tracking:update": ["owner", "collaborator"],
  "tracking:assign": ["owner", "collaborator"],
  "comments:read": ["owner", "collaborator", "viewer"],
  "comments:write": ["owner", "collaborator", "viewer"],
  "comments:deleteOwn": ["owner", "collaborator", "viewer"],
  "comments:deleteAny": ["owner"],
  "letters:generate": ["owner", "collaborator"],
  "documents:view": ["owner", "collaborator", "viewer"],
  "documents:add": ["owner", "collaborator"],
  "documents:deleteOwn": ["owner", "collaborator"],
  "documents:deleteAny": ["owner"],
  "members:view": ["owner", "collaborator", "viewer"],
  "members:manage": ["owner"],
  "activity:view": ["owner", "collaborator", "viewer"],
  "contracts:edit": ["owner", "collaborator"],
  "wishes:edit": ["owner"],
  "trustedContact:manage": ["owner"],
};

const ALL_ROLES: DossierRole[] = ["owner", "collaborator", "viewer", "trusted_contact"];

describe("can", () => {
  for (const [action, allowedRoles] of Object.entries(MATRIX) as [DossierAction, DossierRole[]][]) {
    it(`grants ${action} to exactly ${allowedRoles.join(", ")}`, () => {
      for (const role of ALL_ROLES) {
        expect(can(role, action)).toBe(allowedRoles.includes(role));
      }
    });
  }

  it("grants nothing to a trusted contact", () => {
    const actions = Object.keys(MATRIX) as DossierAction[];
    expect(actions.filter((action) => can("trusted_contact", action))).toEqual([]);
  });

  it("grants nothing to a non-member", () => {
    const actions = Object.keys(MATRIX) as DossierAction[];
    expect(actions.filter((action) => can(null, action))).toEqual([]);
  });
});

describe("isAssignable", () => {
  it("accepts owners and collaborators only", () => {
    expect(ALL_ROLES.filter(isAssignable)).toEqual(["owner", "collaborator"]);
  });
});
