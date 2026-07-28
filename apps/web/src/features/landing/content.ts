export const landingContent = {
  hero: {
    title: "Après un décès, on ne devrait pas avoir à deviner",
    subtitle:
      "Chaque année, des familles laissent passer des aides et des sommes auxquelles elles pouvaient prétendre, simplement parce que personne ne leur a dit qu'elles existaient. Sorento identifie ce qui vous concerne et vous accompagne, démarche par démarche.",
    cta: "Commencer mon diagnostic gratuit",
    ctaHint: "Sans compte, en quelques minutes.",
  },

  howItWorks: {
    title: "Comment ça marche",
    steps: [
      {
        title: "Vous répondez à quelques questions",
        description:
          "Une dizaine de questions simples, sans jargon. Vous pouvez vous arrêter et reprendre quand vous voulez.",
      },
      {
        title: "Vous recevez votre parcours",
        description:
          "Les démarches qui vous concernent vraiment, dans l'ordre, avec les délais, les organismes et les courriers pré-remplis.",
      },
      {
        title: "Vous avancez, à plusieurs si vous le souhaitez",
        description:
          "Chacun prend ce qu'il peut : l'un la banque, l'autre la CPAM. Tout le monde voit où en est le dossier.",
      },
    ],
  },

  scope: {
    title: "Ce que nous faisons, et ce que nous ne faisons pas",
    does: [
      "Identifier les démarches et les aides qui correspondent à votre situation",
      "Vous donner les délais, les organismes et les liens officiels",
      "Préparer des modèles de courriers que vous relisez et signez",
      "Vous permettre de vous répartir le travail entre proches",
    ],
    doesNot: [
      "Remplacer un notaire, un avocat ou un conseiller",
      "Effectuer les démarches à votre place auprès des organismes",
      "Prélever une commission sur les sommes que vous récupérez",
      "Donner un conseil juridique adapté à votre cas particulier",
    ],
  },

  reassurance: {
    title: "Ce que vous devez savoir",
    points: [
      {
        title: "Gratuit pour les familles",
        description: "Le diagnostic, le parcours et les courriers sont gratuits.",
      },
      {
        title: "Aucune commission",
        description:
          "Les services de recherche de sommes non réclamées (Ciclade, AGIRA) sont publics et gratuits. Nous ne prenons rien dessus.",
      },
      {
        title: "Données hébergées en Europe",
        description:
          "Vos informations sont stockées sur des serveurs situés dans l'Union européenne et ne sont jamais revendues.",
      },
    ],
  },

  footer: {
    legalNotice: "Mentions légales",
    privacy: "Confidentialité",
    terms: "Conditions générales d'utilisation",
    login: "J'ai déjà un compte",
    signup: "Créer un compte",
  },
} as const;
