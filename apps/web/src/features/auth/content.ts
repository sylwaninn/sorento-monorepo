export const authContent = {
  signup: {
    title: "Créer un compte",
    description: "Gratuit pour les familles, sans engagement.",
    emailLabel: "Email",
    passwordLabel: "Mot de passe",
    passwordHint: "12 caractères minimum.",
    termsLabel:
      "J'accepte les conditions générales d'utilisation et la politique de confidentialité.",
    submitButton: "Créer mon compte",
    alreadyHaveAccount: "Vous avez déjà un compte ?",
    loginLink: "Se connecter",
    devSkipConfirmationLabel: "DEV — créer le compte sans email de confirmation",
    devSkipConfirmationHint:
      "Visible uniquement en développement local. Le compte est créé déjà confirmé et la session est ouverte immédiatement.",
  },
  verifyEmail: {
    title: "Vérifiez votre boîte mail",
    description:
      "Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre compte.",
    diagnosticKept:
      "Votre diagnostic est conservé et sera rattaché à votre compte une fois l'email confirmé.",
    resendButton: "Renvoyer l'email de confirmation",
    emailResent: "Email renvoyé.",
    cooldownPrefix: "Renvoyer dans",
    seconds: "s",
  },
  login: {
    title: "Se connecter",
    passwordTab: "Mot de passe",
    magicLinkTab: "Lien magique",
    emailLabel: "Email",
    passwordLabel: "Mot de passe",
    submitButtonPassword: "Se connecter",
    submitButtonMagicLink: "Recevoir le lien de connexion",
    forgotPasswordLink: "Mot de passe oublié ?",
    noAccount: "Pas encore de compte ?",
    signupLink: "Créer un compte",
    magicLinkSent: "Lien envoyé. Vérifiez votre boîte mail.",
    resendConfirmationLink: "Renvoyer l'email de confirmation",
  },
  passwordResetRequest: {
    title: "Mot de passe oublié",
    description: "Indiquez votre email, nous vous envoyons un lien pour le réinitialiser.",
    emailLabel: "Email",
    submitButton: "Envoyer le lien",
    confirmation:
      "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.",
    backToLogin: "Retour à la connexion",
  },
  passwordResetConfirm: {
    title: "Nouveau mot de passe",
    passwordLabel: "Nouveau mot de passe",
    confirmLabel: "Confirmer le mot de passe",
    passwordHint: "12 caractères minimum.",
    submitButton: "Enregistrer le nouveau mot de passe",
    success: "Mot de passe modifié. Vos autres sessions ont été déconnectées.",
    loginLink: "Se connecter",
    invalidLinkTitle: "Lien invalide ou expiré",
    invalidLinkDescription: "Demandez un nouveau lien de réinitialisation.",
    requestNewLink: "Redemander un lien",
  },
} as const;
