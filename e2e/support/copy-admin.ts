import { mirrors } from "#e2e/support/mirrors";

/**
 * The copy of the back office, plus the two strings the admin journeys need from outside it: the
 * refusal a dossier shows someone with no access, and the list an admin must never see a
 * stranger's dossier in.
 *
 * The two seeded catalog titles are mirrored against seed.sql rather than a content dictionary.
 * They are data, not app copy, but they are still a copy: the profile sandbox proves the rules
 * engine answers a married profile with a survivor pension, and renaming the seeded entry would
 * otherwise turn that into a selector finding nothing.
 */
export const copyAdmin = {
  homeTitle: mirrors("features/admin/content.ts", "Administration"),
  linkCatalog: mirrors("features/admin/content.ts", "Référentiel"),
  linkHistory: mirrors("features/admin/content.ts", "Historique des modifications"),
  linkTesting: mirrors("features/admin/content.ts", "Test de profil"),
  linkMetrics: mirrors("features/admin/content.ts", "Statistiques"),
  linkDesignSystem: mirrors("features/admin/content.ts", "Design system"),

  catalogTitle: mirrors("features/admin/content.ts", "Référentiel"),
  tabProcedures: mirrors("features/admin/content.ts", "Démarches"),
  tabBenefits: mirrors("features/admin/content.ts", "Aides"),
  addButton: mirrors("features/admin/content.ts", "Ajouter"),
  editButton: mirrors("features/admin/content.ts", "Modifier"),
  deleteButton: mirrors("features/admin/content.ts", "Supprimer"),
  saveButton: mirrors("features/admin/content.ts", "Enregistrer"),
  deleteConfirmButton: mirrors("features/admin/content.ts", "Confirmer la suppression"),

  procedureCode: mirrors("features/admin/content.ts", "Code"),
  procedureTitle: mirrors("features/admin/content.ts", "Titre"),
  procedureDescription: mirrors("features/admin/content.ts", "Description"),
  procedureOrganization: mirrors("features/admin/content.ts", "Organisme"),
  sourceUrlLabel: mirrors("features/admin/content.ts", "URL source"),
  lastVerifiedDateLabel: mirrors("features/admin/content.ts", "Dernière vérification"),

  activeInJourney: mirrors("features/admin/content.ts", "Actif dans le parcours"),

  benefitMainCondition: mirrors("features/admin/content.ts", "Condition principale"),
  benefitFormUrl: mirrors("features/admin/content.ts", "URL du formulaire"),
  benefitCautionText: mirrors(
    "features/admin/content.ts",
    "Texte de prudence (affiché à l'utilisateur)",
  ),

  historyTitle: mirrors("features/admin/content.ts", "Historique des modifications"),
  historyCreated: mirrors("features/admin/content.ts", "création"),
  historyEmpty: mirrors("features/admin/content.ts", "Aucune modification enregistrée."),

  testingTitle: mirrors("features/admin/content.ts", "Test de profil"),
  testingNotice: mirrors(
    "features/admin/content.ts",
    "Bac à sable interne : simule un profil et affiche le parcours résultant, sans créer de dossier.",
  ),
  testingDeathDateLabel: mirrors(
    "features/admin/content.ts",
    "Date du décès simulée (optionnel, laisser vide pour le mode préparation)",
  ),
  testingProceduresTitle: mirrors("features/admin/content.ts", "Démarches applicables"),
  testingBenefitsTitle: mirrors("features/admin/content.ts", "Aides éligibles"),
  testingNoBenefits: mirrors("features/admin/content.ts", "Aucune aide éligible avec ce profil."),

  metricsTitle: mirrors("features/admin/content.ts", "Statistiques"),
  metricsNotice: mirrors(
    "features/admin/content.ts",
    "Comptages agrégés et anonymisés uniquement. Aucun accès aux dossiers, suivis, commentaires ou documents.",
  ),
  metricsTotalUsers: mirrors("features/admin/content.ts", "Utilisateurs"),
  metricsTotalDossiers: mirrors("features/admin/content.ts", "Dossiers"),
  metricsDossiersByStatus: mirrors("features/admin/content.ts", "Dossiers par statut"),
  metricsStatusPreparation: mirrors("features/admin/content.ts", "Préparation"),

  designSystemTitle: mirrors("features/admin/content.ts", "Design system"),

  maritalStatusQuestion: mirrors(
    "features/diagnostic/content.ts",
    "Quel était son statut matrimonial ?",
  ),
  maritalStatusMarried: mirrors("features/diagnostic/content.ts", "Marié(e)"),
  maritalStatusSingle: mirrors("features/diagnostic/content.ts", "Célibataire"),

  seededCivilStatusProcedure: mirrors(
    "../../../supabase/seed.sql",
    "Déclarer le décès à la mairie",
  ),
  seededSurvivorPensionProcedure: mirrors(
    "../../../supabase/seed.sql",
    "Demander la pension de réversion",
  ),
  seededSurvivorPensionBenefit: mirrors("../../../supabase/seed.sql", "Pension de réversion"),

  dossierOutOfReach: mirrors(
    "features/dossier/DossierHomePage.tsx",
    "Ce dossier est introuvable ou vous n’y avez pas accès.",
  ),
  myDossiers: mirrors("features/dossiers/DossiersPage.tsx", "Mes dossiers"),
} as const;
