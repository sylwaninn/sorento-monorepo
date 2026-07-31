export const audiencesContent = {
  title: "Deux chemins : organiser maintenant, ou préparer l’après.",
  description:
    "Vous traversez la perte d’un proche, ou vous souhaitez préparer les choses pour les vôtres. Sorento vous ouvre le bon parcours, avec les mêmes repères clairs.",
  items: [
    {
      id: "close",
      title: "Organiser les démarches, sans avoir à tout comprendre d’un coup",
      description:
        "Sorento repère ce qui peut concerner votre famille, met en avant ce qui compte maintenant et garde le reste pour plus tard.",
      specCaption: "L’essentiel du parcours",
      spec: ["Démarches", "Aides et capitaux", "Pièces et courriers", "Suivi"],
      cta: "Commencer les démarches",
    },
    {
      id: "preparation",
      title: "Préparer l’après, et laisser des repères clairs à ceux qui comptent",
      description:
        "Vous rassemblez l’essentiel à votre rythme : contrats, documents, souhaits. Le moment venu, vos proches trouvent tout au même endroit.",
      specCaption: "Ce que vous laissez prêt",
      spec: ["Contrats et assurances", "Documents importants", "Souhaits", "Contact de confiance"],
      cta: "Commencer ma préparation",
    },
  ],
} as const;

export type AudienceId = (typeof audiencesContent)["items"][number]["id"];
