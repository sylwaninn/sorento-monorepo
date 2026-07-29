export const accountContent = {
  title: "Paramètres du compte",
  email: {
    title: "Adresse email",
    currentLabel: "Email actuel",
    newLabel: "Nouvelle adresse email",
    button: "Changer l'email",
    notice:
      "Un email de confirmation sera envoyé à l'ancienne et à la nouvelle adresse. Le changement n'est effectif qu'une fois les deux confirmés.",
    success: "Demande envoyée. Confirmez le changement depuis les deux boîtes mail.",
  },
  password: {
    title: "Mot de passe",
    currentLabel: "Mot de passe actuel",
    newLabel: "Nouveau mot de passe",
    confirmLabel: "Confirmer le nouveau mot de passe",
    button: "Changer le mot de passe",
    success: "Mot de passe modifié. Vos autres sessions ont été déconnectées.",
  },
  dataExport: {
    title: "Mes données",
    description:
      "Téléchargez l'ensemble des données de votre compte et des dossiers auxquels vous avez accès, au format JSON.",
    button: "Exporter mes données",
    fileName: "sorento-mes-donnees.json",
  },
  deleteAccount: {
    title: "Supprimer mon compte",
    description:
      "La suppression est définitive. Vos préférences, vos notifications et votre appartenance aux dossiers sont effacées. Le contenu de vos commentaires est retiré et remplacé par la mention « commentaire supprimé », afin que le fil reste lisible pour les autres membres.",
    ownedDossiersWarning:
      "Vous êtes titulaire d'au moins un dossier. Transférez la titularité à un collaborateur, ou supprimez le dossier, avant de supprimer votre compte : sans titulaire, un dossier deviendrait inaccessible aux autres membres.",
    button: "Supprimer définitivement mon compte",
    confirmTitle: "Supprimer votre compte ?",
    confirmDescription:
      "Cette action est définitive et ne peut pas être annulée. Pensez à exporter vos données avant de continuer.",
    confirmButton: "Oui, supprimer mon compte",
  },
} as const;
