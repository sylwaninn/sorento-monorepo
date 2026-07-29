import { assert, assertEquals, assertFalse, assertStringIncludes } from "jsr:@std/assert@1";
import {
  activationContent,
  digestContent,
  genericContent,
  NOTIFICATION_SUBJECTS,
  reminderContent,
  withDossierLink,
  type ReminderItem,
} from "@shared/emails.ts";
import { unsubscribeFooter, type EmailContent } from "@shared/mailer.ts";

/**
 * escapeHtml has its own suite, which proves the helper works. This one proves the callers use
 * it: three escaping holes were fixed in these bodies without a test changing, because the
 * bodies were built inside the cron function and nothing could read them back.
 *
 * Alongside the escaping, the two product rules that ride on every outbound email: no name in
 * the subject, and a notification type the recipient can switch off in one click.
 */

const SITE_URL = "http://localhost:5173";

const SCRIPT_TAG = "<script>alert(1)</script>";
const IMAGE_TAG = "<img src=x onerror=alert(1)>";
const ATTRIBUTE_BREAKOUT = `" onmouseover='x`;

const reminderItem = (title: string): ReminderItem => ({ trackingId: "tracking-1", title });

Deno.test("reminderContent escapes a tag injected through a deadline title", () => {
  const body = reminderContent([reminderItem(SCRIPT_TAG)], [], "deadline_approaching").bodyHtml;

  assertFalse(body.includes("<script"));
  assertStringIncludes(body, "&lt;script&gt;alert(1)&lt;/script&gt;");
});

// The two lists are two separate interpolation sites: a fix applied to one only would pass a
// test that looked at deadlines alone.
Deno.test("reminderContent escapes a tag injected through a waiting title", () => {
  const body = reminderContent([], [reminderItem(IMAGE_TAG)], "prolonged_waiting").bodyHtml;

  assertFalse(body.includes("<img"));
  assertStringIncludes(body, "&lt;img src=x onerror=alert(1)&gt;");
});

Deno.test("reminderContent leaves no unescaped quote a title could break out on", () => {
  const body = reminderContent(
    [reminderItem(ATTRIBUTE_BREAKOUT)],
    [reminderItem(ATTRIBUTE_BREAKOUT)],
    "deadline_approaching",
  ).bodyHtml;

  // The builder emits no attribute of its own, so any quote in the output came from the title.
  assertFalse(body.includes('"'));
  assertFalse(body.includes("'"));
  assertStringIncludes(body, "&quot; onmouseover=&#39;x");
});

Deno.test("reminderContent passes accented French through untouched", () => {
  const title = "Résiliation de l’abonnement électricité";
  const body = reminderContent([reminderItem(title)], [], "deadline_approaching").bodyHtml;

  assertStringIncludes(body, title);
});

Deno.test("reminderContent does not double-escape a title containing an ampersand", () => {
  const body = reminderContent(
    [reminderItem("Banque & assurances")],
    [],
    "deadline_approaching",
  ).bodyHtml;

  assertStringIncludes(body, "Banque &amp; assurances");
  assertFalse(body.includes("&amp;amp;"));
});

// "Emails: sober, no name of the deceased in the subject" (CLAUDE.md). A title is free text
// typed into the catalog, so the subject counts items and names none of them.
Deno.test("reminderContent keeps every title out of the subject", () => {
  const content = reminderContent(
    [reminderItem("Succession de Jean Durand")],
    [reminderItem("Pension de réversion de Jean Durand")],
    "deadline_approaching",
  );

  assertFalse(content.subject.includes("Durand"));
  assertEquals(content.subject, "Votre dossier : 1 échéance et 1 démarche en attente");
});

Deno.test("reminderContent counts each list and pluralises it", () => {
  const one = [reminderItem("Banque")];
  const two = [reminderItem("Banque"), reminderItem("Assurance")];

  assertEquals(
    reminderContent(one, [], "deadline_approaching").subject,
    "Votre dossier : 1 échéance",
  );
  assertEquals(
    reminderContent(two, [], "deadline_approaching").subject,
    "Votre dossier : 2 échéances",
  );
  assertEquals(
    reminderContent([], one, "prolonged_waiting").subject,
    "Votre dossier : 1 démarche en attente",
  );
});

/**
 * The label is a phrase, so the plural mark belongs on its head noun. Appending an "s" to the
 * whole label produced "2 démarche en attentes", which is what this asserts against: a subject
 * line is the first thing a bereaved reader sees, and it read as careless.
 */
Deno.test("reminderContent marks the plural on the noun, not on the last word", () => {
  const two = [reminderItem("Banque"), reminderItem("Assurance")];

  assertEquals(
    reminderContent([], two, "prolonged_waiting").subject,
    "Votre dossier : 2 démarches en attente",
  );
});

Deno.test("reminderContent lists both groups under their own heading", () => {
  const body = reminderContent(
    [reminderItem("Banque")],
    [reminderItem("Assurance")],
    "deadline_approaching",
  ).bodyHtml;

  assertStringIncludes(body, "<p>Échéances proches : Banque.</p>");
  assertStringIncludes(body, "<p>En attente depuis un moment : Assurance.</p>");
});

Deno.test("reminderContent unsubscribes from the reminder type it was built for", () => {
  assertEquals(
    reminderContent([reminderItem("Banque")], [], "prolonged_waiting").unsubscribeType,
    "prolonged_waiting",
  );
});

Deno.test("digestContent reports the week's numbers", () => {
  const content = digestContent({ percentage: 42, completedThisWeek: 3, remaining: 7 });

  assertStringIncludes(content.bodyHtml, "3 démarche(s) traitée(s) cette semaine.");
  assertStringIncludes(content.bodyHtml, "42 % du dossier est traité, 7 démarche(s) restante(s).");
  assertEquals(content.subject, "Votre dossier : le point de la semaine");
});

// A payload written before a field existed must render a number, never "undefined".
Deno.test("digestContent falls back to zero for a payload with nothing in it", () => {
  const body = digestContent({}).bodyHtml;

  assertFalse(body.includes("undefined"));
  assertStringIncludes(body, "0 démarche(s) traitée(s) cette semaine.");
  assertStringIncludes(body, "0 % du dossier est traité, 0 démarche(s) restante(s).");
});

// Progress, never pressure: the digest says what advanced, never what is late.
Deno.test("digestContent never counts what is overdue", () => {
  const body = digestContent({ percentage: 10, completedThisWeek: 0, remaining: 12 }).bodyHtml;

  assertFalse(body.includes("retard"));
  assertFalse(body.includes("dépassé"));
});

Deno.test("activationContent announces the grace period while the activation is pending", () => {
  const content = activationContent("pending");

  assertEquals(content.subject, "Activation d'un dossier en cours");
  assertStringIncludes(content.bodyHtml, "48 heures");
  assertEquals(content.unsubscribeType, "dossier_activated");
});

Deno.test("activationContent announces the activation once it is effective", () => {
  const content = activationContent(undefined);

  assertEquals(content.subject, "Dossier activé");
  assertStringIncludes(content.bodyHtml, "Le dossier est maintenant actif.");
  assertEquals(content.unsubscribeType, "dossier_activated");
});

// The phase comes from a stored payload, so an unknown value must land on the safe branch
// rather than announce an activation that has not happened.
Deno.test("activationContent treats an unknown phase as the effective one", () => {
  assertEquals(activationContent("something-else").subject, activationContent(undefined).subject);
});

Deno.test("genericContent uses the declared subject for a known notification type", () => {
  assertEquals(genericContent("mention").subject, "Vous avez été mentionné dans un commentaire");
  assertEquals(
    genericContent("mention").bodyHtml,
    "<p>Vous avez été mentionné dans un commentaire.</p>",
  );
});

// The type is a database value, not a name, but a subject built from an unknown one must stay
// a constant: it is the only interpolation the generic branch could ever grow.
Deno.test("genericContent falls back to a neutral subject for an unknown type", () => {
  const content = genericContent("<script>alert(1)</script>");

  assertEquals(content.subject, "Nouvelle notification");
  assertEquals(content.bodyHtml, "<p>Nouvelle notification.</p>");
});

Deno.test("genericContent unsubscribes from the type it was built for", () => {
  assertEquals(genericContent("member_joined").unsubscribeType, "member_joined");
});

const everyBuilderOutput = (): EmailContent[] => [
  reminderContent([reminderItem(SCRIPT_TAG)], [], "deadline_approaching"),
  reminderContent([], [reminderItem(SCRIPT_TAG)], "prolonged_waiting"),
  digestContent({ percentage: 42, completedThisWeek: 3, remaining: 7 }),
  activationContent("pending"),
  activationContent(undefined),
  genericContent("mention"),
  genericContent("unknown_type"),
];

// One-click unsubscribe is mandatory on every email, and the footer only deep-links to the
// right preference when the builder names the type it is sending on behalf of.
Deno.test("every builder names the preference its email can be switched off from", () => {
  for (const content of everyBuilderOutput()) {
    const unsubscribeType = content.unsubscribeType;
    assert(unsubscribeType !== undefined, `no unsubscribeType on "${content.subject}"`);
    assertStringIncludes(
      unsubscribeFooter(SITE_URL, unsubscribeType),
      `notification=${encodeURIComponent(unsubscribeType)}`,
    );
  }
});

/**
 * The subject is the one part of the email visible before it is opened, so it never carries
 * free text: either one of the declared constants, or the reminder's count-only form.
 */
Deno.test("no builder interpolates free text into a subject", () => {
  const constants = new Set([
    ...Object.values(NOTIFICATION_SUBJECTS),
    "Nouvelle notification",
    "Activation d'un dossier en cours",
    "Dossier activé",
  ]);

  for (const content of everyBuilderOutput()) {
    const isCountOnlyReminder = /^Votre dossier : \d+ [^<>&"]+$/.test(content.subject);
    assert(
      constants.has(content.subject) || isCountOnlyReminder,
      `unexpected subject: ${content.subject}`,
    );
  }
});

Deno.test("withDossierLink appends the link without disturbing the body it was given", () => {
  const content = withDossierLink(genericContent("mention"), `${SITE_URL}/dossiers/abc`);

  assertStringIncludes(content.bodyHtml, "<p>Vous avez été mentionné dans un commentaire.</p>");
  assertStringIncludes(
    content.bodyHtml,
    `<p><a href="${SITE_URL}/dossiers/abc">Voir le dossier</a></p>`,
  );
  assertEquals(content.subject, "Vous avez été mentionné dans un commentaire");
  assertEquals(content.unsubscribeType, "mention");
});

// The assembled message is what actually leaves: body, link and footer together.
Deno.test("a hostile title survives nowhere in the html the mailer would send", () => {
  const content = withDossierLink(
    reminderContent([reminderItem(SCRIPT_TAG)], [reminderItem(IMAGE_TAG)], "deadline_approaching"),
    `${SITE_URL}/dossiers/abc`,
  );
  const html = `${content.bodyHtml}${unsubscribeFooter(SITE_URL, content.unsubscribeType)}`;

  assertFalse(html.includes("<script"));
  assertFalse(html.includes("<img"));
  assertStringIncludes(html, "&lt;script&gt;");
  assertStringIncludes(html, "&lt;img src=x onerror=alert(1)&gt;");
  assertStringIncludes(html, "Ne plus recevoir ce type d'email");
});
