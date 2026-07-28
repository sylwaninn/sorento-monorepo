/**
 * Every cache key in one place. Scattered string literals mean a rename in one file silently
 * desynchronises the invalidation in another, and the screen keeps showing stale data.
 */
export const queryKeys = {
  catalog: {
    procedures: () => ["catalog", "procedures"] as const,
    allProcedures: () => ["catalog", "procedures", "all"] as const,
    benefits: () => ["catalog", "benefits"] as const,
    allBenefits: () => ["catalog", "benefits", "all"] as const,
    conditions: () => ["catalog", "conditions"] as const,
    letterTemplates: (procedureId?: string) =>
      ["catalog", "letter-templates", ...(procedureId === undefined ? [] : [procedureId])] as const,
    allLetterTemplates: () => ["catalog", "letter-templates", "all"] as const,
    history: () => ["catalog", "history"] as const,
  },
  dossiers: {
    list: () => ["dossiers"] as const,
    detail: (dossierId: string) => ["dossiers", dossierId] as const,
    members: (dossierId: string) => ["dossiers", dossierId, "members"] as const,
    memberProfiles: (dossierId: string) => ["dossiers", dossierId, "member-profiles"] as const,
    answers: (dossierId: string) => ["dossiers", dossierId, "answers"] as const,
    tracking: (dossierId: string) => ["dossiers", dossierId, "tracking"] as const,
    documents: (dossierId: string) => ["dossiers", dossierId, "documents"] as const,
    contracts: (dossierId: string) => ["dossiers", dossierId, "contracts"] as const,
    wishes: (dossierId: string) => ["dossiers", dossierId, "wishes"] as const,
    comments: (dossierId: string, procedureId?: string) =>
      ["dossiers", dossierId, "comments", procedureId ?? "all"] as const,
    activity: (dossierId: string, procedureId?: string) =>
      ["dossiers", dossierId, "activity", procedureId ?? "all"] as const,
    invitations: (dossierId: string) => ["dossiers", dossierId, "invitations"] as const,
    trustedContacts: (dossierId: string) => ["dossiers", dossierId, "trusted-contacts"] as const,
  },
  account: {
    notifications: () => ["account", "notifications"] as const,
    notificationPreferences: () => ["account", "notification-preferences"] as const,
    isAdmin: (userId: string) => ["account", "is-admin", userId] as const,
  },
  admin: {
    metrics: () => ["admin", "metrics"] as const,
  },
} as const;
