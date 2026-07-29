/**
 * The French copy the journeys drive the app through.
 *
 * These journeys are a black box: they import none of the app's packages, so the per-feature
 * content dictionaries cannot be imported either and every string a journey clicks on has to be
 * repeated here. A repetition nothing compares is a repetition that drifts, and the way it
 * surfaces is the worst kind of failure a suite can have: a selector that finds nothing, twelve
 * minutes into CI, pointing at the test rather than at the wording that moved.
 *
 * So each entry names the dictionary it was copied from, and `pnpm check:tests` refuses one whose
 * dictionary no longer contains that text. The rename then fails in milliseconds, before the
 * commit, naming both sides.
 *
 * Strings are the whole label rather than a fragment of it. Playwright matches an accessible name
 * exactly, and a fragment would also keep passing after the half it does not name is rewritten.
 */

/**
 * Records which dictionary a string was copied from. Both arguments are read by the checker in
 * scripts/check-tests.mjs, which is why they have to stay string literals rather than constants.
 */
const mirrors = (_dictionary: string, text: string): string => text;

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
