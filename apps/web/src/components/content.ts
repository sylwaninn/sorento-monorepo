import type { LandingAnchorId } from "@/navigation";

// Indexed by the profession string carried by catalog rows, hence the open key set.
const professionArticles: Record<string, string> = {
  notaire: "d'un notaire",
  avocat: "d'un avocat",
  "conseiller retraite": "d'un conseiller retraite",
  "conseiller bancaire": "d'un conseiller bancaire",
};

/**
 * One list drives both the homepage header and the footer that every public page carries, so the
 * two can never disagree on which sections the site has.
 */
const publicNavigationLinks = [
  { anchor: "top", label: "Accueil" },
  { anchor: "audiences", label: "Pour qui" },
  { anchor: "result", label: "Les démarches" },
  { anchor: "howItWorks", label: "Le parcours" },
  { anchor: "trust", label: "Confiance" },
  { anchor: "faq", label: "FAQ" },
] as const satisfies readonly { anchor: LandingAnchorId; label: string }[];

export const sharedContent = {
  brand: {
    name: "Sorento",
    signature: "L’après, plus simplement.",
    homeLabel: "Sorento, retour à l’accueil",
  },
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
    professionArticles,
  },

  legalNotice:
    "Ce service fournit de l'information générale personnalisée. Il ne remplace ni un notaire, ni un avocat, ni un conseiller.",

  publicNavigation: {
    mainLabel: "Navigation principale",
    sectionLabel: "Navigation de la page d’accueil",
    links: publicNavigationLinks,
    login: "Se connecter",
    start: "Commencer",
  },

  publicFooter: {
    description:
      "Des repères concrets pour organiser les démarches après la perte d’un proche, ou préparer l’après pour les vôtres.",
    // The compliance promise every public page closes on, kept small but always present.
    scopeTitle: "Sorento informe et organise. Vous gardez la main.",
    scopeDescription:
      "Sorento ne réalise pas les démarches à votre place et ne remplace ni un notaire, ni un avocat, ni un conseiller. Les courriers proposés restent des modèles que vous relisez et signez.",
    legalNotice: "Mentions légales",
    privacy: "Confidentialité",
    terms: "Conditions générales d’utilisation",
    login: "J’ai déjà un compte",
    signup: "Créer un compte",
    copyright: "© 2026 Sorento",
  },
} as const;
