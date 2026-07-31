export const heroContent = {
  title: "Après un décès, un chemin clair pour vous et vos proches.",
  subtitle:
    "Racontez votre situation en quelques réponses. Sorento en fait un parcours à votre mesure : les démarches dans le bon ordre, les aides qui peuvent vous revenir, des courriers prêts à relire et un suivi partagé. Gratuit, à votre rythme.",
  cta: "Organiser les démarches",
  secondaryCta: "Préparer l’après pour mes proches",
  trustPoints: [
    {
      id: "official-sources",
      label: "Une information issue des sources officielles",
    },
    {
      id: "no-commission",
      label: "Aucune commission sur les sommes qui vous reviennent",
    },
    {
      id: "eu-hosting",
      label: "Vos données hébergées dans l’Union européenne",
    },
  ],
} as const;

export type TrustPointId = (typeof heroContent)["trustPoints"][number]["id"];
