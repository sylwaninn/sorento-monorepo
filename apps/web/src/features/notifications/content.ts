export const notificationsContent = {
  bell: {
    label: "Notifications",
    empty: "Aucune notification.",
    markAllRead: "Tout marquer comme lu",
  },
  typeLabels: {
    procedure_assigned: "Une démarche vous a été assignée",
    mention: "Vous avez été mentionné dans un commentaire",
    comment_on_assigned_procedure: "Nouveau commentaire sur une démarche assignée",
    status_changed_on_assigned_procedure: "Statut mis à jour sur une démarche assignée",
    deadline_approaching: "Échéance à venir",
    prolonged_waiting: "Démarche en attente depuis longtemps",
    invitation: "Invitation à rejoindre un dossier",
    member_joined: "Un membre a rejoint le dossier",
    member_left: "Un membre a quitté le dossier",
    dossier_activated: "Dossier activé",
    weekly_digest: "Résumé hebdomadaire",
  },
  preferences: {
    title: "Préférences de notification",
    description:
      "Choisissez ce que vous recevez dans l'application et par email, par type d'événement.",
    inAppColumn: "Application",
    emailColumn: "Email",
    saved: "Préférence enregistrée.",
  },
} as const;
