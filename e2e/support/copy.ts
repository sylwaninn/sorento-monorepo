import { mirrors } from "#e2e/support/mirrors";

/**
 * The copy the shared helpers drive the app through: the landing page, the diagnostic, signing
 * in, and the two flows that were the suite's first journeys. Copy belonging to one area lives
 * beside that area's journey, in its own `copy-<area>.ts`, so two journeys never queue behind the
 * same file. See mirrors.ts for why any of this is repeated at all.
 */
export const copy = {
  landingCta: mirrors("features/landing/content.ts", "Commencer mon diagnostic gratuit"),

  modeDeath: mirrors("features/diagnostic/content.ts", "Un proche est décédé"),
  modePreparation: mirrors("features/diagnostic/content.ts", "Je prépare ma situation"),
  next: mirrors("features/diagnostic/content.ts", "Suivant"),
  finish: mirrors("features/diagnostic/content.ts", "Voir mon résultat"),
  signupFromResult: mirrors("features/diagnostic/content.ts", "Créer mon compte gratuit"),
  createDossierFromResult: mirrors("features/diagnostic/content.ts", "Créer mon dossier"),
  proceduresIdentified: mirrors("features/diagnostic/content.ts", "démarches identifiées"),
  resultNotice: mirrors(
    "features/diagnostic/content.ts",
    "Ils ne constituent pas un conseil individuel.",
  ),
  noDiagnostic: mirrors("features/diagnostic/content.ts", "Aucun diagnostic en cours."),
  restartDiagnostic: mirrors("features/diagnostic/content.ts", "Recommencer le diagnostic"),

  loginEmail: mirrors("features/auth/content.ts", "Email"),
  loginPassword: mirrors("features/auth/content.ts", "Mot de passe"),
  submitLogin: mirrors("features/auth/content.ts", "Se connecter"),

  inviteEmail: mirrors("features/dossier/content.ts", "Email"),
  sendInvitation: mirrors("features/dossier/content.ts", "Envoyer l'invitation"),
  invitedToJoin: mirrors("features/dossier/content.ts", "vous invite à rejoindre le dossier de"),
  acceptInvitation: mirrors("features/dossier/content.ts", "Accepter l'invitation"),
  activationPending: mirrors("features/dossier/content.ts", "Sauf opposition, il sera activé le"),
  opposeActivation: mirrors("features/dossier/content.ts", "Signaler un problème / m'opposer"),
  confirmOpposition: mirrors("features/dossier/content.ts", "Confirmer l'opposition"),
} as const;
