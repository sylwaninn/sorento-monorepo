/**
 * Structure and product-truthful wording. Everything in square brackets is an operator
 * detail (company name, registration numbers, host, DPO contact) that only the publisher can
 * fill in, and the whole set has to be reviewed by a lawyer before going live — which is why
 * the placeholders are visible rather than invented.
 */
const OPERATOR_PLACEHOLDER = "[Raison sociale de l'éditeur]";

export const legalContent = {
  reviewBanner:
    "Document en cours de finalisation. Les mentions entre crochets doivent être complétées par l'éditeur avant la mise en ligne.",

  legalNotice: {
    title: "Mentions légales",
    sections: [
      {
        title: "Éditeur du service",
        paragraphs: [
          `Le service Sorento est édité par ${OPERATOR_PLACEHOLDER}, [forme juridique] au capital de [montant], immatriculée au RCS de [ville] sous le numéro [SIREN].`,
          "Siège social : [adresse postale]. Téléphone : [numéro]. Courriel : [adresse de contact].",
          "Directeur de la publication : [nom du directeur de la publication].",
        ],
      },
      {
        title: "Hébergement",
        paragraphs: [
          "Les données et l'application sont hébergées sur des serveurs situés dans l'Union européenne, opérés par [nom de l'hébergeur], [adresse de l'hébergeur].",
        ],
      },
      {
        title: "Nature du service",
        paragraphs: [
          "Sorento fournit de l'information générale personnalisée sur les démarches administratives consécutives à un décès, à partir des réponses fournies par l'utilisateur.",
          "Le service ne constitue ni un conseil juridique, ni un acte, ni une prestation de service réglementée. Il ne remplace ni un notaire, ni un avocat, ni un conseiller. Les informations issues du référentiel sont datées et accompagnées de leur source officielle.",
          "Les courriers générés sont des modèles destinés à être relus, complétés et signés par l'utilisateur.",
        ],
      },
      {
        title: "Propriété intellectuelle",
        paragraphs: [
          "Les contenus du service, hors données publiques et hors contenus déposés par les utilisateurs, sont protégés par le droit de la propriété intellectuelle.",
        ],
      },
    ],
  },

  privacy: {
    title: "Politique de confidentialité",
    sections: [
      {
        title: "Responsable de traitement",
        paragraphs: [
          `${OPERATOR_PLACEHOLDER} est responsable des traitements décrits ci-dessous. Contact : [adresse de contact], délégué à la protection des données : [contact DPO].`,
        ],
      },
      {
        title: "Données traitées",
        paragraphs: [
          "Données de compte : adresse email, prénom affiché aux autres membres du dossier.",
          "Données de dossier : identité de la personne concernée, date du décès, réponses au questionnaire de diagnostic, avancement des démarches, notes, commentaires, documents déposés, contrats inventoriés et volontés saisies en mode préparation.",
          "Données techniques : journaux de connexion et d'activité nécessaires à la sécurité du service.",
        ],
      },
      {
        title: "Finalités et bases légales",
        paragraphs: [
          "Fourniture du service et exécution des conditions générales (article 6.1.b du RGPD) : diagnostic, parcours de démarches, partage entre proches, notifications liées aux démarches.",
          "Intérêt légitime (article 6.1.f) : sécurité du service, prévention des abus, mesures d'audience agrégées et anonymisées.",
          "Consentement (article 6.1.a) : envois facultatifs, dont le récapitulatif hebdomadaire, révocable à tout moment depuis les paramètres du compte.",
        ],
      },
      {
        title: "Données sensibles",
        paragraphs: [
          "Certaines informations saisies dans un dossier peuvent révéler des éléments relatifs à la santé ou à la situation familiale. Elles ne sont accessibles qu'aux membres du dossier, selon leur rôle, et ne sont jamais utilisées à des fins publicitaires.",
          "L'administrateur de la plateforme n'a accès ni aux dossiers, ni aux suivis, ni aux commentaires, ni aux documents des utilisateurs.",
        ],
      },
      {
        title: "Destinataires",
        paragraphs: [
          "Les membres du dossier, selon le rôle que le titulaire leur a attribué.",
          "Les sous-traitants techniques strictement nécessaires : hébergement (Union européenne) et envoi des emails transactionnels. Aucune donnée n'est vendue ni cédée à des tiers à des fins commerciales.",
        ],
      },
      {
        title: "Durées de conservation",
        paragraphs: [
          "Un élément supprimé est conservé 30 jours en corbeille, puis effacé définitivement, documents déposés compris.",
          "Les données de compte sont conservées tant que le compte existe. À la suppression du compte, elles sont effacées sous [délai] ; les dossiers dont vous êtes titulaire doivent au préalable être transférés ou supprimés.",
        ],
      },
      {
        title: "Vos droits",
        paragraphs: [
          "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. L'export de vos données est disponible directement depuis les paramètres du compte.",
          "Ces droits s'exercent auprès de [adresse de contact]. Vous pouvez introduire une réclamation auprès de la CNIL.",
        ],
      },
    ],
  },

  terms: {
    title: "Conditions générales d'utilisation",
    sections: [
      {
        title: "Objet",
        paragraphs: [
          "Les présentes conditions régissent l'accès au service Sorento et son utilisation. La création d'un compte vaut acceptation.",
        ],
      },
      {
        title: "Nature et limites du service",
        paragraphs: [
          "Le service fournit une information générale personnalisée à partir des réponses de l'utilisateur. Il ne délivre aucun conseil juridique individuel et ne se substitue à aucune profession réglementée.",
          "Les délais, montants et conditions affichés proviennent d'un référentiel documenté, daté et sourcé ; ils sont indicatifs et peuvent avoir évolué. Il appartient à l'utilisateur de vérifier auprès de l'organisme concerné.",
          "Les courriers générés sont des modèles que l'utilisateur relit, complète et signe sous sa propre responsabilité.",
        ],
      },
      {
        title: "Compte et sécurité",
        paragraphs: [
          "L'utilisateur est responsable de la confidentialité de ses identifiants. Le mot de passe doit comporter au moins douze caractères.",
          "L'utilisateur s'engage à ne créer un dossier que pour une situation qui le concerne, et à n'y inviter que des personnes légitimes.",
        ],
      },
      {
        title: "Partage et rôles",
        paragraphs: [
          "Le titulaire d'un dossier décide qui y accède et avec quels droits. Le retrait d'un membre est immédiat et libère les démarches qui lui étaient confiées.",
          "Le contact de confiance désigné en mode préparation n'a accès à aucune donnée du dossier tant que celui-ci n'est pas activé. L'activation qu'il déclenche est soumise à un délai de 48 heures pendant lequel les autres membres peuvent s'y opposer.",
        ],
      },
      {
        title: "Gratuité",
        paragraphs: [
          "Le service est gratuit pour les familles. Aucune commission n'est prélevée sur les sommes récupérées auprès des organismes.",
        ],
      },
      {
        title: "Responsabilité",
        paragraphs: [
          "L'éditeur met en œuvre les moyens raisonnables pour assurer l'exactitude des informations et la disponibilité du service, sans garantie de résultat quant à l'issue des démarches entreprises.",
        ],
      },
      {
        title: "Modification et résiliation",
        paragraphs: [
          "L'utilisateur peut supprimer son compte à tout moment depuis les paramètres. L'éditeur peut faire évoluer les présentes conditions ; les utilisateurs en sont informés avant l'entrée en vigueur.",
        ],
      },
    ],
  },
} as const;
