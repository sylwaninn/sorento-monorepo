export const sharedContent = {
  loading: "Chargement",
  back: "Retour",
  backHome: "Retour à l'accueil",
  cancel: "Annuler",
  save: "Enregistrer",
  errorTitle: "Action impossible",
  unknownMember: "Membre",
  deletedAccount: "Compte supprimé",

  catalogNotice: {
    sourceLabel: "Source officielle",
    verifiedAtPrefix: "Information vérifiée le",
    professionPrefix: "Information générale. Pour votre situation précise, rapprochez-vous",
    // Used when the catalog entry names no specific profession.
    defaultProfession: "d'un professionnel qualifié",
    professionArticles: {
      notaire: "d'un notaire",
      avocat: "d'un avocat",
      "conseiller retraite": "d'un conseiller retraite",
      "conseiller bancaire": "d'un conseiller bancaire",
    } as Record<string, string>,
  },

  legalNotice:
    "Ce service fournit de l'information générale personnalisée. Il ne remplace ni un notaire, ni un avocat, ni un conseiller.",
} as const;
