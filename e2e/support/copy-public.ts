import { mirrors } from "#e2e/support/mirrors";

/**
 * The copy of the pages a visitor sees before they have trusted anyone with anything: the
 * landing argument, the three legal documents, and the guide shell. See mirrors.ts for why any
 * of this is repeated rather than imported.
 */
export const copyPublic = {
  heroTitle: mirrors(
    "features/landing/content/hero.ts",
    "Après un décès, un chemin clair pour vous et vos proches.",
  ),
  howItWorksTitle: mirrors(
    "features/landing/content/how-it-works.ts",
    "Un chemin simple, en trois étapes.",
  ),
  scopeTitle: mirrors("components/content.ts", "Sorento informe et organise. Vous gardez la main."),
  scopeDescription: mirrors(
    "components/content.ts",
    "Sorento ne réalise pas les démarches à votre place et ne remplace ni un notaire, ni un avocat, ni un conseiller. Les courriers proposés restent des modèles que vous relisez et signez.",
  ),
  reassuranceTitle: mirrors(
    "features/landing/content/reassurance.ts",
    "Des engagements clairs envers votre famille.",
  ),

  takesNoCommission: mirrors(
    "features/landing/content/reassurance.ts",
    "Sorento ne prend rien sur les sommes éventuellement versées à votre famille.",
  ),
  freeForFamilies: mirrors("features/landing/content/reassurance.ts", "Gratuit pour les familles"),
  noCommissionTitle: mirrors("features/landing/content/reassurance.ts", "Aucune commission"),
  noCommissionDetail: mirrors(
    "features/landing/content/reassurance.ts",
    "Les services AGIRA et Ciclade sont publics et gratuits. Sorento ne prend rien sur les sommes éventuellement versées à votre famille.",
  ),
  footerLegalNotice: mirrors("components/content.ts", "Mentions légales"),
  footerPrivacy: mirrors("components/content.ts", "Confidentialité"),
  footerTerms: mirrors("components/content.ts", "Conditions générales d’utilisation"),
  footerLogin: mirrors("components/content.ts", "J’ai déjà un compte"),
  footerSignup: mirrors("components/content.ts", "Créer un compte"),

  generalInformationNotice: mirrors(
    "components/content.ts",
    "Ce service fournit de l'information générale personnalisée. Il ne remplace ni un notaire, ni un avocat, ni un conseiller.",
  ),

  legalNoticeTitle: mirrors("features/legal/content.ts", "Mentions légales"),
  publisherSection: mirrors("features/legal/content.ts", "Éditeur du service"),
  serviceNatureSection: mirrors("features/legal/content.ts", "Nature du service"),
  privacyTitle: mirrors("features/legal/content.ts", "Politique de confidentialité"),
  processedDataSection: mirrors("features/legal/content.ts", "Données traitées"),
  adminHasNoAccess: mirrors(
    "features/legal/content.ts",
    "L'administrateur de la plateforme n'a accès ni aux dossiers, ni aux suivis, ni aux commentaires, ni aux documents des utilisateurs.",
  ),
  termsTitle: mirrors("features/legal/content.ts", "Conditions générales d'utilisation"),
  termsPurposeSection: mirrors("features/legal/content.ts", "Objet"),
  termsNoCommission: mirrors(
    "features/legal/content.ts",
    "Le service est gratuit pour les familles. Aucune commission n'est prélevée sur les sommes récupérées auprès des organismes.",
  ),

  articleNotFoundTitle: mirrors("features/content/content.ts", "Article introuvable"),
  articleNotFoundBody: mirrors(
    "features/content/content.ts",
    "Cet article n'existe pas ou n'est pas encore publié.",
  ),
  articleCtaTitle: mirrors("features/content/content.ts", "Savoir ce qui vous concerne, vous"),
  articleCtaButton: mirrors("features/content/content.ts", "Faire le point sur ma situation"),

  back: mirrors("components/content.ts", "Retour"),
  myDossiers: mirrors("features/dossiers/DossiersPage.tsx", "Mes dossiers"),
} as const;
