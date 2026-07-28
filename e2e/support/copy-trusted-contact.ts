import { mirrors } from "#e2e/support/mirrors";

/**
 * The copy the trusted-contact journeys click on: designating someone, their consent, and the
 * screen they come back to years later to report a death. Two dictionaries meet here, the
 * dossier's and the activation feature's, and each string names the one it was copied from.
 */
export const trustedContactCopy = {
  title: mirrors("features/dossier/content.ts", "Contact de confiance"),
  emailLabel: mirrors("features/dossier/content.ts", "Email"),
  futureRoleLabel: mirrors("features/dossier/content.ts", "Rôle à l'activation"),
  futureRoleOwner: mirrors("features/dossier/content.ts", "Titulaire"),
  designate: mirrors("features/dossier/content.ts", "Envoyer la désignation"),
  designationSent: mirrors(
    "features/dossier/content.ts",
    "Désignation envoyée. La personne recevra un email pour confirmer.",
  ),
  awaitingConsent: mirrors("features/dossier/content.ts", "En attente de confirmation"),
  hasConsented: mirrors("features/dossier/content.ts", "A confirmé son rôle"),
  revoke: mirrors("features/dossier/content.ts", "Révoquer"),
  confirmRevocation: mirrors("features/dossier/content.ts", "Confirmer la révocation"),
  noTrustedContact: mirrors("features/dossier/content.ts", "Aucun contact de confiance désigné."),
  preparationTitle: mirrors("features/dossier/content.ts", "Organiser mes affaires"),

  consentTitle: mirrors(
    "features/activation/content.ts",
    "Confirmer votre rôle de contact de confiance",
  ),
  consentButton: mirrors("features/activation/content.ts", "Confirmer ce rôle"),
  consentDone: mirrors("features/activation/content.ts", "Rôle confirmé."),
  // The consent screen and the activation screen word a dead link identically, and both say it
  // from the same dictionary, so one entry serves the two.
  deadLinkTitle: mirrors("features/activation/content.ts", "Lien invalide ou expiré"),
  consentDeadLinkDescription: mirrors(
    "features/activation/content.ts",
    "Ce lien n'est plus valable. Demandez à la personne titulaire de vous en désigner un nouveau.",
  ),

  reportDeathTitle: mirrors("features/activation/content.ts", "Signaler un décès"),
  designatedForPrefix: mirrors(
    "features/activation/content.ts",
    "Vous êtes désigné(e) contact de confiance pour le dossier de",
  ),
  gracePeriodNotice: mirrors(
    "features/activation/content.ts",
    "Les autres membres de ce dossier seront prévenus et pourront s'opposer pendant 48 heures avant l'activation définitive.",
  ),
  deathDateLabel: mirrors("features/activation/content.ts", "Date du décès"),
  reportDeathButton: mirrors("features/activation/content.ts", "Signaler le décès"),
  deathReported: mirrors(
    "features/activation/content.ts",
    "Signalement envoyé. Les membres du dossier ont été prévenus.",
  ),
  activationEffectivePrefix: mirrors(
    "features/activation/content.ts",
    "Sauf opposition, l'activation sera effective le",
  ),
  activationDeadLinkDescription: mirrors(
    "features/activation/content.ts",
    "Ce lien n'est plus valable.",
  ),
} as const;
