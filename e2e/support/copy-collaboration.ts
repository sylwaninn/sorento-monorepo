import { mirrors } from "#e2e/support/mirrors";

/**
 * The copy the collaboration journeys click on: roles, member management, assignment and the
 * activity log. It lives beside its journey rather than in the shared dictionary so two areas
 * never queue behind the same file. See mirrors.ts for why any of this is repeated at all.
 */
export const collaborationCopy = {
  membersTitle: mirrors("features/dossier/content.ts", "Membres et partage"),
  inviteTitle: mirrors("features/dossier/content.ts", "Inviter un membre"),
  inviteRoleLabel: mirrors("features/dossier/content.ts", "Rôle"),
  roleCollaborator: mirrors("features/dossier/content.ts", "Collaborateur"),
  roleViewer: mirrors("features/dossier/content.ts", "Lecteur"),
  removeMember: mirrors("features/dossier/content.ts", "Retirer"),
  transferOwnership: mirrors("features/dossier/content.ts", "Transférer la titularité"),
  confirmTransfer: mirrors("features/dossier/content.ts", "Confirmer le transfert"),
  revokeInvitation: mirrors("features/dossier/content.ts", "Révoquer"),
  pendingInvitationsEmpty: mirrors("features/dossier/content.ts", "Aucune invitation en attente."),

  statusLabel: mirrors("features/dossier/content.ts", "Statut"),
  statusInProgress: mirrors("features/dossier/content.ts", "En cours"),
  assigneeLabel: mirrors("features/dossier/content.ts", "Assigné à"),
  unassigned: mirrors("features/dossier/content.ts", "Non assigné"),

  filterMine: mirrors("features/dossier/content.ts", "Les miennes"),
  noProcedures: mirrors("features/dossier/content.ts", "Aucune démarche pour l'instant."),

  commentsTab: mirrors("features/dossier/content.ts", "Commentaires"),
  writeComment: mirrors("features/dossier/content.ts", "Écrire un commentaire…"),
  publishComment: mirrors("features/dossier/content.ts", "Publier"),

  memberRemoved: mirrors("features/dossier/content.ts", "a retiré un membre"),
  invitationRevoked: mirrors("features/dossier/content.ts", "a révoqué une invitation"),
  ownershipTransferred: mirrors("features/dossier/content.ts", "a transféré la titularité"),

  invalidInvitation: mirrors("features/dossier/content.ts", "Invitation invalide ou expirée"),
} as const;
