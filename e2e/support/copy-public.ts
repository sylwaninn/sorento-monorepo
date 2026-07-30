import { mirrors } from "#e2e/support/mirrors";

/**
 * The copy of the pages a visitor sees before they have trusted anyone with anything: the
 * landing argument, the three legal documents, and the guide shell. See mirrors.ts for why any
 * of this is repeated rather than imported.
 */
export const copyPublic = {
  heroTitle: mirrors(
    "features/landing/content.ts",
    "Après un décès, on ne devrait pas avoir à deviner",
  ),
  ctaHint: mirrors("features/landing/content.ts", "Sans compte, en quelques minutes."),
  howItWorksTitle: mirrors("features/landing/content.ts", "Comment ça marche"),
  scopeTitle: mirrors(
    "features/landing/content.ts",
    "Ce que nous faisons, et ce que nous ne faisons pas",
  ),
  reassuranceTitle: mirrors("features/landing/content.ts", "Ce que vous devez savoir"),

  // The four promises a bereaved visitor is owed before anything is asked of them. CLAUDE.md
  // makes two of them compliance rules rather than marketing: no commission, and information
  // rather than individual legal advice.
  takesNoCommission: mirrors(
    "features/landing/content.ts",
    "Prélever une commission sur les sommes que vous récupérez",
  ),
  givesNoLegalAdvice: mirrors(
    "features/landing/content.ts",
    "Donner un conseil juridique adapté à votre cas particulier",
  ),
  replacesNoProfessional: mirrors(
    "features/landing/content.ts",
    "Remplacer un notaire, un avocat ou un conseiller",
  ),
  freeForFamilies: mirrors("features/landing/content.ts", "Gratuit pour les familles"),
  noCommissionTitle: mirrors("features/landing/content.ts", "Aucune commission"),
  noCommissionDetail: mirrors(
    "features/landing/content.ts",
    "Les services de recherche de sommes non réclamées (Ciclade, AGIRA) sont publics et gratuits. Nous ne prenons rien dessus.",
  ),

  footerLegalNotice: mirrors("features/landing/content.ts", "Mentions légales"),
  footerPrivacy: mirrors("features/landing/content.ts", "Confidentialité"),
  footerTerms: mirrors("features/landing/content.ts", "Conditions générales d'utilisation"),
  footerLogin: mirrors("features/landing/content.ts", "J'ai déjà un compte"),
  footerSignup: mirrors("features/landing/content.ts", "Créer un compte"),

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
