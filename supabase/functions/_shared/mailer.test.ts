import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { sendEmail, unsubscribeFooter } from "@shared/mailer.ts";

const SITE_URL = "http://localhost:5173";

/**
 * Emails leave the product and land in a grieving person's inbox, so the rules on them are not
 * cosmetic: one-click unsubscribe on every message, and a failed send that reports itself
 * instead of being swallowed.
 */

Deno.test("unsubscribeFooter deep-links to the exact preference", () => {
  const footer = unsubscribeFooter(SITE_URL, "deadline_approaching");

  assertStringIncludes(footer, `href="${SITE_URL}/parametres?notification=deadline_approaching"`);
});

Deno.test("unsubscribeFooter falls back to the settings page for an untyped email", () => {
  assertStringIncludes(unsubscribeFooter(SITE_URL, undefined), `href="${SITE_URL}/parametres"`);
});

// The type reaches the URL as a query value; an unencoded one would break the link.
Deno.test("unsubscribeFooter encodes the notification type", () => {
  assertStringIncludes(unsubscribeFooter(SITE_URL, "a b&c"), "notification=a%20b%26c");
});

Deno.test("unsubscribeFooter always produces a link", () => {
  for (const type of [undefined, "mention", "weekly_digest"]) {
    assertStringIncludes(unsubscribeFooter(SITE_URL, type), "<a href=");
  }
});

interface StubbedFetch {
  restore: () => void;
  lastBody: () => Record<string, unknown>;
}

const stubFetch = (respond: () => Response | Promise<Response>): StubbedFetch => {
  const original = globalThis.fetch;
  let captured: Record<string, unknown> = {};

  globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) => {
    captured = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return Promise.resolve(respond());
  }) as typeof fetch;

  return {
    restore: () => {
      globalThis.fetch = original;
    },
    lastBody: () => captured,
  };
};

const silenceConsoleError = (): (() => void) => {
  const original = console.error;
  console.error = () => {};
  return () => {
    console.error = original;
  };
};

Deno.test("sendEmail appends the unsubscribe footer to the body it sends", async () => {
  const stub = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    const result = await sendEmail("proche@example.test", {
      subject: "Une démarche vous a été confiée",
      bodyHtml: "<p>Bonjour</p>",
      unsubscribeType: "procedure_assigned",
    });

    assertEquals(result, "sent");
    const html = String(stub.lastBody()["html"]);
    assertStringIncludes(html, "<p>Bonjour</p>");
    assertStringIncludes(html, "notification=procedure_assigned");
  } finally {
    stub.restore();
  }
});

// No name of the deceased in the subject is a product rule, but what this asserts is narrower
// and checkable: the subject is passed through untouched, so the caller owns it entirely.
Deno.test("sendEmail sends the subject it was given, unchanged", async () => {
  const stub = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    await sendEmail("proche@example.test", { subject: "Rappel", bodyHtml: "<p>x</p>" });

    assertEquals(stub.lastBody()["subject"], "Rappel");
    assertEquals(stub.lastBody()["to"], "proche@example.test");
  } finally {
    stub.restore();
  }
});

Deno.test("sendEmail reports a provider rejection instead of claiming delivery", async () => {
  const stub = stubFetch(() => new Response("rate limited", { status: 429 }));
  const restoreConsole = silenceConsoleError();
  try {
    assertEquals(await sendEmail("proche@example.test", { subject: "x", bodyHtml: "y" }), "failed");
  } finally {
    restoreConsole();
    stub.restore();
  }
});

Deno.test("sendEmail reports a transport failure instead of throwing at the caller", async () => {
  const original = globalThis.fetch;
  const restoreConsole = silenceConsoleError();
  globalThis.fetch = (() => Promise.reject(new Error("ECONNRESET"))) as typeof fetch;
  try {
    assertEquals(await sendEmail("proche@example.test", { subject: "x", bodyHtml: "y" }), "failed");
  } finally {
    restoreConsole();
    globalThis.fetch = original;
  }
});
