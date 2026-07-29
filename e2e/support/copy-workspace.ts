import { mirrors } from "#e2e/support/mirrors";

/**
 * The copy the dossier workspace journey drives the app through: the dossier list, the active
 * dashboard, a procedure and its tabs, documents, benefits, forgotten money, the situation form,
 * contracts, wishes, the activity log and the notification bell.
 *
 * It lives beside its own journey rather than in copy.ts so two areas never queue behind the same
 * file. See mirrors.ts for why any of this is repeated at all.
 */
export const workspaceCopy = {
  /**
   * The dossier list states its copy inline instead of in a dictionary of its own, so these three
   * entries name the screen itself. They move to features/dossiers/content.ts the day that file
   * exists, and check:tests keeps naming the file that actually holds the sentence meanwhile.
   */
  noDossierYet: mirrors("features/dossiers/DossiersPage.tsx", "Aucun dossier pour l'instant."),
  createDossierFromList: mirrors("features/dossiers/DossiersPage.tsx", "Créer un dossier"),
  dossierActive: mirrors("features/dossiers/DossiersPage.tsx", "Actif"),

  back: mirrors("components/content.ts", "Retour"),
  sourceLabel: mirrors("components/content.ts", "Source officielle"),
  verifiedAtPrefix: mirrors("components/content.ts", "Information vérifiée le"),
  professionPrefix: mirrors(
    "components/content.ts",
    "Information générale. Pour votre situation précise, rapprochez-vous",
  ),
  professionNotaire: mirrors("components/content.ts", "d'un notaire"),

  dashboardTitle: mirrors("features/dossier/content.ts", "Tableau de bord"),
  focusTitle: mirrors("features/dossier/content.ts", "À faire maintenant"),
  filterAll: mirrors("features/dossier/content.ts", "Toutes les démarches"),
  filterMine: mirrors("features/dossier/content.ts", "Les miennes"),
  noProcedures: mirrors("features/dossier/content.ts", "Aucune démarche pour l'instant."),
  /**
   * The interpolated half of `progressValue(percentage)`. The number is what the assertion reads
   * back, so only the fixed half can be compared against the dictionary.
   */
  progressSuffix: mirrors("features/dossier/content.ts", "% des démarches traitées"),
  overdue: mirrors("features/dossier/content.ts", "À traiter dès que possible"),
  benefitsLink: mirrors("features/dossier/content.ts", "Voir les aides potentielles"),
  forgottenMoneyLink: mirrors("features/dossier/content.ts", "Argent oublié"),
  documentsLink: mirrors("features/dossier/content.ts", "Documents"),
  activityLink: mirrors("features/dossier/content.ts", "Activité"),

  statusLabel: mirrors("features/dossier/content.ts", "Statut"),
  statusTodo: mirrors("features/dossier/content.ts", "À faire"),
  statusDone: mirrors("features/dossier/content.ts", "Terminé"),
  statusNotApplicable: mirrors("features/dossier/content.ts", "Sans objet"),

  tabProcedure: mirrors("features/dossier/content.ts", "Démarche"),
  tabLetter: mirrors("features/dossier/content.ts", "Courrier"),
  tabComments: mirrors("features/dossier/content.ts", "Commentaires"),
  tabHistory: mirrors("features/dossier/content.ts", "Historique"),

  letterNotice: mirrors(
    "features/dossier/content.ts",
    "Ceci est un modèle à relire, compléter et signer par vos soins. Il ne s'agit pas d'un acte rédigé pour vous.",
  ),
  letterMissingVariables: mirrors(
    "features/dossier/content.ts",
    "Champs à compléter avant de générer le courrier :",
  ),
  letterDownload: mirrors("features/dossier/content.ts", "Télécharger en PDF"),
  letterSenderName: mirrors("features/dossier/content.ts", "Votre nom (signataire)"),

  commentPlaceholder: mirrors("features/dossier/content.ts", "Écrire un commentaire…"),
  commentSubmit: mirrors("features/dossier/content.ts", "Publier"),
  commentDelete: mirrors("features/dossier/content.ts", "Supprimer"),
  commentDeleted: mirrors("features/dossier/content.ts", "Commentaire supprimé"),
  commentsEmpty: mirrors("features/dossier/content.ts", "Aucun commentaire pour l'instant."),
  historyEmpty: mirrors("features/dossier/content.ts", "Aucun événement pour l'instant."),

  benefitsTitle: mirrors("features/dossier/content.ts", "Aides et prestations"),
  benefitsFormLink: mirrors("features/dossier/content.ts", "Accéder au formulaire officiel"),

  forgottenMoneyNotice: mirrors(
    "features/dossier/content.ts",
    "Ces services officiels sont gratuits. Nous ne prélevons aucune commission sur les sommes récupérées.",
  ),
  forgottenMoneyBlockNotice: mirrors(
    "features/dossier/content.ts",
    "Ce service officiel oriente vers l'organisme compétent, il ne s'y substitue pas.",
  ),
  officialServiceLink: mirrors("features/dossier/content.ts", "Accéder au service officiel"),
  inventoriedContractsTitle: mirrors(
    "features/dossier/content.ts",
    "Contrats inventoriés à vérifier",
  ),
  inventoriedContractsEmpty: mirrors(
    "features/dossier/content.ts",
    "Aucun contrat n'a été inventorié pendant la préparation.",
  ),

  documentsTitle: mirrors("features/dossier/content.ts", "Documents"),
  documentsNotice: mirrors(
    "features/dossier/content.ts",
    "Espace de stockage sécurisé et chiffré. Ce n'est pas un coffre-fort numérique à valeur probante.",
  ),
  documentAdd: mirrors("features/dossier/content.ts", "Ajouter un document"),
  documentsEmpty: mirrors("features/dossier/content.ts", "Aucun document pour l'instant."),
  documentDownload: mirrors("features/dossier/content.ts", "Télécharger"),
  documentDelete: mirrors("features/dossier/content.ts", "Supprimer"),

  activityTitle: mirrors("features/dossier/content.ts", "Activité"),
  activityEmpty: mirrors("features/dossier/content.ts", "Aucun événement pour l'instant."),
  didChangeStatus: mirrors("features/dossier/content.ts", "a changé un statut"),
  didAddDocument: mirrors("features/dossier/content.ts", "a ajouté un document"),
  didRemoveDocument: mirrors("features/dossier/content.ts", "a supprimé un document"),
  didGenerateLetter: mirrors("features/dossier/content.ts", "a généré un courrier"),
  didUpdateAnswers: mirrors("features/dossier/content.ts", "a mis à jour les réponses"),

  situationTitle: mirrors("features/dossier/content.ts", "Ma situation"),
  situationSave: mirrors("features/dossier/content.ts", "Enregistrer"),
  situationSaved: mirrors("features/dossier/content.ts", "Enregistré."),

  contractsTitle: mirrors("features/dossier/content.ts", "Contrats et assurances"),
  contractsEmpty: mirrors("features/dossier/content.ts", "Aucun contrat renseigné pour l'instant."),
  contractAdd: mirrors("features/dossier/content.ts", "Ajouter un contrat"),
  contractTypeLabel: mirrors("features/dossier/content.ts", "Type de contrat"),
  contractCompanyLabel: mirrors("features/dossier/content.ts", "Organisme"),
  contractNumberLabel: mirrors("features/dossier/content.ts", "Numéro de contrat (optionnel)"),
  contractSave: mirrors("features/dossier/content.ts", "Enregistrer"),
  contractDelete: mirrors("features/dossier/content.ts", "Supprimer"),

  wishesTitle: mirrors("features/dossier/content.ts", "Souhaits et personnes à prévenir"),
  wishesNotice: mirrors(
    "features/dossier/content.ts",
    "Ces informations n'ont pas de valeur légale. Pour organiser vos obsèques de façon contraignante, rapprochez-vous d'un notaire ou d'une entreprise de pompes funèbres habilitée.",
  ),
  funeralWishesLabel: mirrors("features/dossier/content.ts", "Souhaits concernant mes obsèques"),
  peopleToNotifyLabel: mirrors("features/dossier/content.ts", "Personnes à prévenir"),
  wishesSave: mirrors("features/dossier/content.ts", "Enregistrer"),
  wishesSaved: mirrors("features/dossier/content.ts", "Enregistré."),

  maritalStatusQuestion: mirrors(
    "features/diagnostic/content.ts",
    "Quel était son statut matrimonial ?",
  ),
  maritalSingle: mirrors("features/diagnostic/content.ts", "Célibataire"),

  notificationsBell: mirrors("features/notifications/content.ts", "Notifications"),
  notificationMemberJoined: mirrors(
    "features/notifications/content.ts",
    "Un membre a rejoint le dossier",
  ),
  markAllNotificationsRead: mirrors("features/notifications/content.ts", "Tout marquer comme lu"),
} as const;
