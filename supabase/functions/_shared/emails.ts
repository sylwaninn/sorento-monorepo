import { escapeHtml } from "@shared/html.ts";
import type { EmailContent } from "@shared/mailer.ts";

/**
 * The bodies of the notification emails, as pure functions of the data they render.
 *
 * They used to be assembled inside send-pending-emails, where nothing could read them back:
 * three escaping holes were closed in outbound emails without a single test changing. Built
 * here, the two rules that matter are assertable without a running stack: every interpolated
 * value goes through escapeHtml, and the subject carries no name (see CLAUDE.md, "Emails:
 * sober, no name of the deceased in the subject, one-click unsubscribe").
 */

export interface ReminderItem {
  trackingId: string;
  title: string;
}

export interface DigestPayload {
  percentage?: number;
  completedThisWeek?: number;
  remaining?: number;
}

export const NOTIFICATION_SUBJECTS: Record<string, string> = {
  procedure_assigned: "Une démarche vous a été assignée",
  mention: "Vous avez été mentionné dans un commentaire",
  comment_on_assigned_procedure: "Nouveau commentaire sur une démarche assignée",
  status_changed_on_assigned_procedure: "Statut mis à jour",
  invitation: "Invitation à rejoindre un dossier",
  member_joined: "Nouveau membre sur un dossier",
  member_left: "Un membre a quitté un dossier",
  dossier_activated: "Dossier activé",
  weekly_digest: "Votre dossier : le point de la semaine",
};

/**
 * Both forms are spelled out rather than derived by appending an "s". The label is a phrase, not
 * a word, so the mark belongs on its head noun and an appended letter lands on whatever word
 * happens to come last: "2 démarche en attentes".
 */
const pluralize = (count: number, singular: string, plural: string): string =>
  `${count} ${count > 1 ? plural : singular}`;

export const reminderContent = (
  deadlines: readonly ReminderItem[],
  waiting: readonly ReminderItem[],
  type: string,
): EmailContent => {
  const parts: string[] = [];
  if (deadlines.length > 0) parts.push(pluralize(deadlines.length, "échéance", "échéances"));
  if (waiting.length > 0) {
    parts.push(pluralize(waiting.length, "démarche en attente", "démarches en attente"));
  }

  const list = (label: string, items: readonly ReminderItem[]): string =>
    items.length === 0
      ? ""
      : `<p>${label} : ${items.map((item) => escapeHtml(item.title)).join(", ")}.</p>`;

  return {
    // No deceased name in the subject.
    subject: `Votre dossier : ${parts.join(" et ")}`,
    bodyHtml: `${list("Échéances proches", deadlines)}${list("En attente depuis un moment", waiting)}`,
    unsubscribeType: type,
  };
};

// Progress, never pressure: what advanced this week, and what is left. No overdue counter.
export const digestContent = (payload: DigestPayload): EmailContent => ({
  subject: NOTIFICATION_SUBJECTS["weekly_digest"] ?? "Votre dossier",
  bodyHtml: `<p>${payload.completedThisWeek ?? 0} démarche(s) traitée(s) cette semaine.</p>
   <p>${payload.percentage ?? 0} % du dossier est traité, ${payload.remaining ?? 0} démarche(s) restante(s).</p>`,
  unsubscribeType: "weekly_digest",
});

export const activationContent = (phase: string | undefined): EmailContent => {
  if (phase === "pending") {
    return {
      subject: "Activation d'un dossier en cours",
      bodyHtml:
        "<p>Le contact de confiance a signalé un décès. Sauf opposition, l'activation sera effective dans 48 heures.</p>",
      unsubscribeType: "dossier_activated",
    };
  }
  return {
    subject: "Dossier activé",
    bodyHtml: "<p>Le dossier est maintenant actif.</p>",
    unsubscribeType: "dossier_activated",
  };
};

export const genericContent = (type: string): EmailContent => {
  const subject = NOTIFICATION_SUBJECTS[type] ?? "Nouvelle notification";
  return { subject, bodyHtml: `<p>${subject}.</p>`, unsubscribeType: type };
};

/**
 * The link is built from SITE_URL and a dossier id, never from anything a member typed, which
 * is why it is appended rather than escaped: escaping would turn a legitimate query separator
 * into an entity inside the href.
 */
export const withDossierLink = (content: EmailContent, link: string): EmailContent => ({
  ...content,
  bodyHtml: `${content.bodyHtml}<p><a href="${link}">Voir le dossier</a></p>`,
});
