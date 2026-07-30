export const reassuranceContent = {
  title: "Des engagements clairs envers votre famille.",
  description:
    "Vous gardez la main à chaque étape. Sorento apporte des repères et des outils, et vous oriente vers un professionnel dès que la situation le demande.",
  points: [
    {
      id: "free",
      title: "Gratuit pour les familles",
      description: "La première synthèse, le parcours et les modèles de courriers sont gratuits.",
    },
    {
      id: "no-commission",
      title: "Aucune commission",
      description:
        "Les services AGIRA et Ciclade sont publics et gratuits. Sorento ne prend rien sur les sommes éventuellement versées à votre famille.",
    },
    {
      id: "official-sources",
      title: "Des sources identifiables",
      description:
        "Les informations renvoient vers les organismes et services officiels compétents.",
    },
    {
      id: "privacy",
      title: "Vos données restent les vôtres",
      description:
        "Elles sont hébergées dans l’Union européenne, ne sont jamais revendues et vous choisissez ce que vous partagez.",
    },
  ],
} as const;

export type ReassuranceId = (typeof reassuranceContent)["points"][number]["id"];
