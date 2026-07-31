export const howItWorksContent = {
  title: "Un chemin simple, en trois étapes.",
  description:
    "Le premier résultat est accessible sans compte et sans engagement. Vous choisissez ensuite, librement, de poursuivre.",
  steps: [
    {
      id: "questionnaire",
      label: "Étape 1",
      title: "Racontez votre situation, simplement",
      description:
        "Le questionnaire s’adapte à vos réponses : vous ne voyez que les questions nécessaires, formulées avec soin.",
    },
    {
      id: "summary",
      label: "Étape 2",
      title: "Recevez une première synthèse",
      description:
        "Vous découvrez les démarches et les aides qui pourraient concerner votre situation, avant même de créer un compte.",
    },
    {
      id: "record",
      label: "Étape 3",
      title: "Ouvrez votre dossier pour passer à l’action",
      description:
        "Suivez l’avancement, complétez les courriers et invitez vos proches, quand vous le souhaitez.",
    },
  ],
  cta: "Faire le point sur ma situation",
} as const;

export type HowItWorksStepId = (typeof howItWorksContent)["steps"][number]["id"];
