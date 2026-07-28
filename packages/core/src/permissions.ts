import type { DossierRole } from "@sorento/domain";

export type DossierAction =
  | "dossier:view"
  | "dossier:update"
  | "dossier:delete"
  | "answers:view"
  | "answers:update"
  | "tracking:view"
  | "tracking:update"
  | "tracking:assign"
  | "comments:read"
  | "comments:write"
  | "comments:deleteOwn"
  | "comments:deleteAny"
  | "letters:generate"
  | "documents:view"
  | "documents:add"
  | "documents:deleteOwn"
  | "documents:deleteAny"
  | "members:view"
  | "members:manage"
  | "activity:view"
  | "contracts:edit"
  | "wishes:edit"
  | "trustedContact:manage";

/**
 * The permission matrix of the specification, in one place, so the UI and the RLS policies
 * can be checked against the same source. The UI hides, the RLS forbids; any divergence
 * between this table and the policies is a blocking bug.
 *
 * trusted_contact is absent on purpose: the role is dormant and grants nothing. It is
 * promoted to owner or collaborator when the dossier is activated, and only then does the
 * person gain access.
 */
const ALLOWED_BY_ROLE: Record<DossierRole, readonly DossierAction[]> = {
  owner: [
    "dossier:view",
    "dossier:update",
    "dossier:delete",
    "answers:view",
    "answers:update",
    "tracking:view",
    "tracking:update",
    "tracking:assign",
    "comments:read",
    "comments:write",
    "comments:deleteOwn",
    "comments:deleteAny",
    "letters:generate",
    "documents:view",
    "documents:add",
    "documents:deleteOwn",
    "documents:deleteAny",
    "members:view",
    "members:manage",
    "activity:view",
    "contracts:edit",
    "wishes:edit",
    "trustedContact:manage",
  ],
  collaborator: [
    "dossier:view",
    "answers:view",
    "tracking:view",
    "tracking:update",
    "tracking:assign",
    "comments:read",
    "comments:write",
    "comments:deleteOwn",
    "letters:generate",
    "documents:view",
    "documents:add",
    "documents:deleteOwn",
    "members:view",
    "activity:view",
    "contracts:edit",
  ],
  viewer: [
    "dossier:view",
    "answers:view",
    "tracking:view",
    "comments:read",
    "comments:write",
    "comments:deleteOwn",
    "documents:view",
    "members:view",
    "activity:view",
  ],
  // Stryker disable next-line ArrayDeclaration: equivalent mutant. Filling this list with an
  // arbitrary string still grants no real action, so `can` answers false either way.
  trusted_contact: [],
};

export const can = (role: DossierRole | null, action: DossierAction): boolean =>
  role !== null && ALLOWED_BY_ROLE[role].includes(action);

// Assignment targets: a viewer coordinates but never carries a procedure, which the
// validate_assignment trigger enforces on the database side too.
export const isAssignable = (role: DossierRole): boolean =>
  role === "owner" || role === "collaborator";
