export const familyStoryContent = {
  title: "À plusieurs, les démarches deviennent plus légères.",
  description:
    "Un proche prévient la banque pendant qu’un autre rassemble les documents ou vérifie les aides. Sorento réunit les informations et l’avancement dans un même dossier, pour que personne n’ait à tout porter.",
  points: [
    "Répartissez clairement ce que chacun prend en charge",
    "Gardez les mêmes repères, documents et échéances",
  ],
  crew: {
    title: "4 proches, un seul dossier",
    caption: "Chacun voit ce qui est fait, en cours ou à faire.",
    extra: "+1",
    members: [
      { id: "marie", name: "Marie" },
      { id: "claire", name: "Claire" },
      { id: "samuel", name: "Samuel" },
    ],
  },
  roles: ["Propriétaire", "Collaborateur", "Contact de confiance"],
  images: {
    mainAlt: "Une mère et sa fille organisent ensemble des documents familiaux",
  },
  cta: "Découvrir le dossier partagé",
} as const;

export type FamilyMemberId = (typeof familyStoryContent)["crew"]["members"][number]["id"];
