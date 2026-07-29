import type { QuestionContent } from "@/features/diagnostic/QuestionField";

export const diagnosticContent = {
  page: {
    title: "Diagnostic",
    backButton: "Retour",
    nextButton: "Suivant",
    finishButton: "Voir mon résultat",
  },
  questions: {
    mode: {
      title: "Un proche est-il décédé, ou préparez-vous une situation ?",
      options: { death: "Un proche est décédé", preparation: "Je prépare ma situation" },
    },
    fullName: {
      title: "Prénom et nom de la personne concernée",
      placeholder: "Jean Dupont",
    },
    deathDate: { title: "Quelle est la date du décès ?" },
    maritalStatus: {
      title: "Quel était son statut matrimonial ?",
      options: {
        married: "Marié(e)",
        civilUnion: "Pacsé(e)",
        cohabiting: "En concubinage",
        single: "Célibataire",
        divorced: "Divorcé(e)",
      },
    },
    survivingSpouseAge: { title: "Quel est l'âge du conjoint survivant ?" },
    employmentStatus: {
      title: "Quelle était sa situation professionnelle ?",
      options: {
        employee: "Salarié(e)",
        retired: "Retraité(e)",
        selfEmployed: "Indépendant(e)",
        jobseeker: "Demandeur d'emploi",
        unemployed: "Sans emploi",
      },
    },
    ownsVehicle: {
      title: "Possédait-il/elle un véhicule ?",
      options: { true: "Oui", false: "Non" },
    },
    housingStatus: {
      title: "Quel était son statut de logement ?",
      options: { tenant: "Locataire", owner: "Propriétaire", hosted: "Hébergé(e)" },
    },
    hasMinorChildren: {
      title: "Y a-t-il des enfants mineurs concernés ?",
      options: { true: "Oui", false: "Non" },
    },
  },
  result: {
    title: "Votre synthèse",
    notice:
      "Ces résultats sont indicatifs et fondés sur vos réponses. Ils ne constituent pas un conseil individuel.",
    proceduresIdentified: "démarches identifiées",
    potentialBenefits: "aides potentielles",
    timeWindows: {
      "24h": "Dans les 24 heures",
      "7d": "Dans les 7 jours",
      "30d": "Dans les 30 jours",
      "6m": "Dans les 6 mois",
    },
    forgottenMoneyBlock: {
      title: "Argent potentiellement oublié",
      description: "Votre profil correspond à des aides ou capitaux parfois non réclamés.",
    },
    cta: {
      title: "Voir le détail et suivre mes démarches",
      description:
        "Créez votre compte gratuit pour accéder au détail, générer vos courriers et suivre votre avancement.",
      button: "Créer mon compte gratuit",
    },
    alreadyLoggedIn: {
      description: "Vous êtes connecté : créez un dossier à partir de ce diagnostic.",
      button: "Créer mon dossier",
      inProgress: "Création du dossier…",
    },
    diagnosticNotFound: "Aucun diagnostic en cours. Recommencez pour obtenir votre synthèse.",
    restart: "Recommencer le diagnostic",
  },
  notice:
    "Ce service fournit de l'information générale personnalisée. Il ne remplace ni un notaire, ni un avocat, ni un conseiller.",
} as const;

const questionContentById = new Map<string, QuestionContent>(
  Object.entries(diagnosticContent.questions),
);

export const questionContentFor = (questionId: string): QuestionContent => {
  const content = questionContentById.get(questionId);
  if (content === undefined) {
    throw new Error(`Missing diagnostic copy for question "${questionId}"`);
  }
  return content;
};
