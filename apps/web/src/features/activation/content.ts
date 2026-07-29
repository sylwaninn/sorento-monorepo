export const activationContent = {
  consent: {
    title: "Confirmer votre rôle de contact de confiance",
    needAccount: "Créez un compte ou connectez-vous pour confirmer ce rôle.",
    signupButton: "Créer un compte",
    loginButton: "Se connecter",
    confirmButton: "Confirmer ce rôle",
    confirmed: "Rôle confirmé.",
    goToDossier: "Accéder au dossier",
    invalidTitle: "Lien invalide ou expiré",
    invalidDescription:
      "Ce lien n'est plus valable. Demandez à la personne titulaire de vous en désigner un nouveau.",
  },
  activate: {
    title: "Signaler un décès",
    loading: "Vérification du lien…",
    invalidTitle: "Lien invalide ou expiré",
    invalidDescription: "Ce lien n'est plus valable.",
    alreadyPendingTitle: "Une activation est déjà en cours",
    alreadyPendingDescription: "Ce dossier a déjà une activation en cours de traitement.",
    descriptionPrefix: "Vous êtes désigné(e) contact de confiance pour le dossier de",
    deathDateLabel: "Date du décès",
    notice:
      "Les autres membres de ce dossier seront prévenus et pourront s'opposer pendant 48 heures avant l'activation définitive.",
    submitButton: "Signaler le décès",
    submitted: "Signalement envoyé. Les membres du dossier ont été prévenus.",
    effectiveAtPrefix: "Sauf opposition, l'activation sera effective le",
  },
} as const;
