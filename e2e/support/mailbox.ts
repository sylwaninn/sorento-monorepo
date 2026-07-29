import { APP_URL, MAILPIT_URL } from "#e2e/support/env";

/**
 * The mailbox the local stack delivers to.
 *
 * Signing up, resetting a password and asking for a magic link all end the same way: the person
 * closes the browser and opens their mail. A journey that stops at "the screen said an email was
 * sent" proves the screen, not the flow, and the half it skips is where the link is built, where
 * the token is minted and where the redirect has to be on the allow-list. All three have been
 * wrong before in this kind of app, and none of them can fail visibly anywhere else.
 *
 * Nothing here is a fixture: it reads what the stack actually sent, and the journey then clicks
 * what a person would click.
 */

interface MailpitAddress {
  Name: string;
  Address: string;
}

interface MailpitSummary {
  ID: string;
  Subject: string;
  Created: string;
  From: MailpitAddress | null;
}

// Asserted, not validated, for the same reason as rest() in backend.ts: the journeys import
// no schema package, and Mailpit's response shape is pinned by its own API. The suite's casts
// live at its two HTTP boundaries, here and there, where they are visible.
const inboxOf = async (address: string): Promise<MailpitSummary[]> => {
  const query = encodeURIComponent(`to:"${address}"`);
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}&limit=20`);
  if (!response.ok) throw new Error(`Mailpit search answered ${response.status}`);
  const body = (await response.json()) as { messages?: MailpitSummary[] };
  return body.messages ?? [];
};

const bodyOf = async (id: string): Promise<string> => {
  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  if (!response.ok) throw new Error(`Mailpit message ${id} answered ${response.status}`);
  const message = (await response.json()) as { HTML?: string; Text?: string };
  return `${message.HTML ?? ""}\n${message.Text ?? ""}`;
};

/**
 * Polls rather than sleeps. Delivery is asynchronous and usually instant, so a fixed pause is
 * either wasted time or an intermittent failure depending on the machine; a deadline is neither.
 */
const until = async <T>(what: string, read: () => Promise<T | null>): Promise<T> => {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const value = await read();
    if (value !== null) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not arrive within 15s`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

export interface ReceivedEmail {
  subject: string;
  body: string;
  /** Who it says it is from, which is the first thing a recipient reads and the last thing a
   * default configuration gets right. */
  from: string;
}

/** The most recent message sent to an address, whatever it is about. */
export const waitForEmail = async (address: string): Promise<ReceivedEmail> => {
  const summary = await until(`an email to ${address}`, async () => {
    const messages = await inboxOf(address);
    return messages[0] ?? null;
  });
  const from = summary.From;
  return {
    subject: summary.Subject,
    body: await bodyOf(summary.ID),
    from: from === null ? "" : `${from.Name} <${from.Address}>`,
  };
};

/**
 * The first link in the message pointing at the app or at the auth callback.
 *
 * Mailpit stores the HTML as sent, so `&` arrives as `&amp;` inside href attributes and a token
 * read straight out of it would carry the entity into the query string.
 */
export const linkIn = (body: string, mustContain: string): string => {
  const links = Array.from(body.matchAll(/https?:\/\/[^\s"'<>)]+/g), (match) =>
    match[0].replaceAll("&amp;", "&"),
  );
  const found = links.find((link) => link.includes(mustContain));
  if (found === undefined) {
    throw new Error(`no link containing "${mustContain}" in the email. Links: ${links.join(", ")}`);
  }
  return found;
};

/**
 * Waits for the mail an auth action triggers and returns the link it carries, as a person would
 * follow it. GoTrue points its callbacks at the configured site URL, which is the origin the
 * journeys run on, so nothing is rewritten here: a mismatch is a real misconfiguration and should
 * fail rather than be papered over.
 */
export const authLinkFor = async (address: string): Promise<string> => {
  const { body } = await waitForEmail(address);
  return linkIn(body, "/auth/v1/verify");
};

/** An absolute URL as a path the browser under test can navigate to directly. */
export const pathOfUrl = (absoluteUrl: string): string => {
  const parsed = new URL(absoluteUrl);
  return parsed.pathname + parsed.search + parsed.hash;
};

export const APP_ORIGIN = APP_URL;
