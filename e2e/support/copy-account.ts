import { mirrors } from "#e2e/support/mirrors";

/**
 * The copy the account and identity journeys click on: signing up, confirming, signing in,
 * recovering a password, and everything on the settings screen up to closing the account.
 *
 * Two of these do not come from a screen's content dictionary, and that is deliberate. The field
 * level refusals are stated once, in the Zod schema the form parses with, and the translated auth
 * errors are stated once in the table that turns a GoTrue code into a French sentence. Naming the
 * real source is what lets check:tests fail on the day either of them is reworded. See mirrors.ts
 * for why any of this is repeated at all.
 */
export const copyAccount = {
  signupTitle: mirrors("features/auth/content.ts", "Créer un compte"),
  signupEmail: mirrors("features/auth/content.ts", "Email"),
  signupPassword: mirrors("features/auth/content.ts", "Mot de passe"),
  signupTerms: mirrors(
    "features/auth/content.ts",
    "J'accepte les conditions générales d'utilisation et la politique de confidentialité.",
  ),
  signupSubmit: mirrors("features/auth/content.ts", "Créer mon compte"),

  verifyEmailTitle: mirrors("features/auth/content.ts", "Vérifiez votre boîte mail"),
  verifyEmailDescription: mirrors(
    "features/auth/content.ts",
    "Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre compte.",
  ),
  diagnosticKept: mirrors(
    "features/auth/content.ts",
    "Vos réponses sont conservées et seront rattachées à votre compte une fois l'email confirmé.",
  ),

  magicLinkTab: mirrors("features/auth/content.ts", "Lien magique"),
  magicLinkSubmit: mirrors("features/auth/content.ts", "Recevoir le lien de connexion"),
  magicLinkSent: mirrors("features/auth/content.ts", "Lien envoyé. Vérifiez votre boîte mail."),
  resendConfirmation: mirrors("features/auth/content.ts", "Renvoyer l'email de confirmation"),
  forgotPasswordLink: mirrors("features/auth/content.ts", "Mot de passe oublié ?"),

  resetRequestTitle: mirrors("features/auth/content.ts", "Mot de passe oublié"),
  resetRequestSubmit: mirrors("features/auth/content.ts", "Envoyer le lien"),
  resetRequestConfirmation: mirrors(
    "features/auth/content.ts",
    "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.",
  ),
  resetNewPassword: mirrors("features/auth/content.ts", "Nouveau mot de passe"),
  resetConfirmPassword: mirrors("features/auth/content.ts", "Confirmer le mot de passe"),
  resetSubmit: mirrors("features/auth/content.ts", "Enregistrer le nouveau mot de passe"),
  resetSuccess: mirrors(
    "features/auth/content.ts",
    "Mot de passe modifié. Vos autres sessions ont été déconnectées.",
  ),

  invalidCredentials: mirrors("auth/auth-error-messages.ts", "Email ou mot de passe incorrect."),
  emailNotConfirmed: mirrors(
    "auth/auth-error-messages.ts",
    "Cette adresse email n'est pas encore confirmée. Vérifiez votre boîte de réception.",
  ),

  passwordTooShort: mirrors(
    "../../../packages/domain/src/auth.ts",
    "Le mot de passe doit contenir au moins 12 caractères.",
  ),
  termsRequired: mirrors(
    "../../../packages/domain/src/auth.ts",
    "Vous devez accepter les CGU et la politique de confidentialité.",
  ),

  settingsTitle: mirrors("features/account/content.ts", "Paramètres du compte"),
  emailCurrentLabel: mirrors("features/account/content.ts", "Email actuel"),
  emailNewLabel: mirrors("features/account/content.ts", "Nouvelle adresse email"),
  emailChangeButton: mirrors("features/account/content.ts", "Changer l'email"),
  emailChangeNotice: mirrors(
    "features/account/content.ts",
    "Un email de confirmation sera envoyé à l'ancienne et à la nouvelle adresse. Le changement n'est effectif qu'une fois les deux confirmés.",
  ),
  emailChangeSuccess: mirrors(
    "features/account/content.ts",
    "Demande envoyée. Confirmez le changement depuis les deux boîtes mail.",
  ),

  passwordCurrentLabel: mirrors("features/account/content.ts", "Mot de passe actuel"),
  passwordNewLabel: mirrors("features/account/content.ts", "Nouveau mot de passe"),
  passwordConfirmLabel: mirrors("features/account/content.ts", "Confirmer le nouveau mot de passe"),
  passwordChangeButton: mirrors("features/account/content.ts", "Changer le mot de passe"),
  passwordChangeSuccess: mirrors(
    "features/account/content.ts",
    "Mot de passe modifié. Vos autres sessions ont été déconnectées.",
  ),

  exportButton: mirrors("features/account/content.ts", "Exporter mes données"),
  exportFileName: mirrors("features/account/content.ts", "sorento-mes-donnees.json"),

  deleteButton: mirrors("features/account/content.ts", "Supprimer définitivement mon compte"),
  deleteOwnedDossiersWarning: mirrors(
    "features/account/content.ts",
    "Vous êtes titulaire d'au moins un dossier. Transférez la titularité à un collaborateur, ou supprimez le dossier, avant de supprimer votre compte : sans titulaire, un dossier deviendrait inaccessible aux autres membres.",
  ),
  deleteConfirmTitle: mirrors("features/account/content.ts", "Supprimer votre compte ?"),
  deleteConfirmButton: mirrors("features/account/content.ts", "Oui, supprimer mon compte"),

  notificationPreferencesTitle: mirrors(
    "features/notifications/content.ts",
    "Préférences de notification",
  ),
  notificationInAppColumn: mirrors("features/notifications/content.ts", "Application"),
  notificationEmailColumn: mirrors("features/notifications/content.ts", "Email"),
  procedureAssignedLabel: mirrors(
    "features/notifications/content.ts",
    "Une démarche vous a été assignée",
  ),
} as const;
