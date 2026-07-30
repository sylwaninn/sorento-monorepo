export const resultContent = {
  title: "Un plan d’action clair, pensé pour votre situation.",
  description:
    "Sorento ne vous remet pas une liste générique. Chaque information est replacée dans votre contexte, pour vous aider à faire le pas suivant.",
  preview: {
    ariaLabel: "Aperçu d’un parcours Sorento",
    windowBrand: "Sorento",
    windowLabel: "Votre parcours",
    title: "À faire maintenant",
    progress: {
      completed: 4,
      connector: "sur",
      total: 12,
      label: "terminées",
      // Read by the progress indicator, which announces a ratio rather than the bare percentage
      // a screen reader would otherwise get from the default percent formatting.
      ariaLabel: "Avancement du parcours",
    },
    items: [
      {
        id: "bank",
        state: "completed",
        window: "Dans les 7 jours",
        title: "Prévenir la banque",
        detail: "Pièces et courrier disponibles",
        status: "Effectué",
        assignee: "marie",
      },
      {
        id: "death-benefit",
        state: "pending",
        window: "Dans les 30 jours",
        title: "Vérifier le capital décès",
        detail: "Conditions et organisme indiqués",
        status: "À vérifier",
        assignee: "claire",
      },
      {
        id: "forgotten-contracts",
        state: "pending",
        window: "Sans urgence",
        title: "Rechercher les contrats oubliés",
        detail: "AGIRA et Ciclade expliqués",
        status: "Plus tard",
        assignee: "samuel",
      },
    ],
  },
  features: [
    {
      id: "schedule",
      title: "Les priorités au bon moment",
      description:
        "Les démarches sont ordonnées selon leurs échéances, avec l’organisme à contacter et les documents nécessaires.",
    },
    {
      id: "benefits",
      title: "Les aides possibles à vérifier",
      description:
        "Le parcours fait émerger les dispositifs qui pourraient correspondre à une situation comme la vôtre.",
    },
    {
      id: "letters",
      title: "Des courriers prêts à relire",
      description:
        "Les informations déjà saisies complètent les modèles. Rien ne part sans votre relecture et votre signature.",
    },
    {
      id: "shared-record",
      title: "Un dossier vraiment partagé",
      description:
        "Chacun peut savoir ce qui est à faire, en cours ou terminé, sans multiplier les messages et les tableaux.",
    },
  ],
} as const;

export type ResultFeatureId = (typeof resultContent)["features"][number]["id"];
