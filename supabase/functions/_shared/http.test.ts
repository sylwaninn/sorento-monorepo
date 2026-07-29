import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { z } from "zod";
import {
  internalError,
  json,
  parseBody,
  parseTokenPayload,
  preflight,
  resolveAllowedOrigin,
} from "@shared/http.ts";

const SITE_URL = "http://localhost:5173";
const ALLOWED = new Set([SITE_URL]);

const post = (body: unknown, headers: Record<string, string> = {}): Request =>
  new Request("http://localhost/invite-member", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

/**
 * These endpoints mutate state (invitations, activations), so a browser on any other origin
 * being able to call them with the user's cookies is exactly what CORS exists to stop.
 */

Deno.test("resolveAllowedOrigin echoes the app's own origin", () => {
  assertEquals(resolveAllowedOrigin(SITE_URL, ALLOWED, SITE_URL), SITE_URL);
});

Deno.test("resolveAllowedOrigin never reflects an origin it was not given", () => {
  for (const hostile of [
    "https://attacker.example",
    "null",
    "*",
    "http://localhost:5173.attacker.example",
    "http://localhost:5174",
  ]) {
    assertEquals(resolveAllowedOrigin(hostile, ALLOWED, SITE_URL), SITE_URL, hostile);
  }
});

Deno.test("resolveAllowedOrigin falls back when the request carries no origin", () => {
  assertEquals(resolveAllowedOrigin(null, ALLOWED, SITE_URL), SITE_URL);
});

Deno.test("preflight answers OPTIONS and nothing else", async () => {
  const options = preflight(new Request("http://localhost/invite-member", { method: "OPTIONS" }));

  assertEquals(options?.status, 200);
  assertEquals(preflight(post({})), null);
  assertEquals(await options?.text(), "ok");
});

Deno.test("preflight declares the methods and headers the functions accept", () => {
  const response = preflight(new Request("http://localhost/x", { method: "OPTIONS" }));
  if (response === null) throw new Error("preflight did not answer an OPTIONS request");
  const allowedHeaders = response.headers.get("Access-Control-Allow-Headers");
  if (allowedHeaders === null) throw new Error("preflight answered without an allow-headers list");

  assertEquals(response.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  assertStringIncludes(allowedHeaders, "authorization");
  assertStringIncludes(allowedHeaders, "x-cron-secret");
  // Without Vary a cache could serve one origin's response to another.
  assertEquals(response.headers.get("Vary"), "Origin");
});

Deno.test("json answers with CORS headers on every response", async () => {
  const response = json(post({}), { ok: true }, 200);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "application/json");
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), SITE_URL);
  assertEquals(await response.json(), { ok: true });
});

const payloadSchema = z.object({ email: z.string().email(), count: z.number().int() });

Deno.test("parseBody returns the parsed value on a valid payload", async () => {
  const result = await parseBody(post({ email: "a@example.test", count: 2 }), payloadSchema);

  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, { email: "a@example.test", count: 2 });
});

Deno.test("parseBody rejects a body that is not JSON", async () => {
  const result = await parseBody(post("{not json"), payloadSchema);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.response.status, 400);
    assertEquals(await result.response.json(), { error: "invalid_json" });
  }
});

// A raw Zod dump on the wire leaks the schema's shape and is unusable by the client; the
// contract is a flat field/message map.
Deno.test("parseBody reports field errors without leaking the schema", async () => {
  const result = await parseBody(post({ email: "nope", count: 1.5 }), payloadSchema);

  assertEquals(result.ok, false);
  if (!result.ok) {
    const body = (await result.response.json()) as {
      error: string;
      fieldErrors: Record<string, string>;
    };
    assertEquals(result.response.status, 400);
    assertEquals(body.error, "invalid_request");
    assertEquals(Object.keys(body.fieldErrors).sort(), ["count", "email"]);
    assertEquals(typeof body.fieldErrors["email"], "string");
  }
});

Deno.test("parseBody keeps the first message per field", async () => {
  const strict = z.object({
    name: z
      .string()
      .min(3)
      .max(4)
      .regex(/^[a-z]+$/),
  });
  const result = await parseBody(post({ name: "AB" }), strict);

  assertEquals(result.ok, false);
  if (!result.ok) {
    const body = (await result.response.json()) as { fieldErrors: Record<string, string> };
    assertEquals(Object.keys(body.fieldErrors), ["name"]);
  }
});

Deno.test("parseBody labels an error with no path as global", async () => {
  const result = await parseBody(post([1, 2, 3]), payloadSchema);

  assertEquals(result.ok, false);
  if (!result.ok) {
    const body = (await result.response.json()) as { fieldErrors: Record<string, string> };
    assertEquals(Object.keys(body.fieldErrors), ["_global"]);
  }
});

const tokenSchema = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/) });
const TOKEN = "a".repeat(64);

Deno.test("parseTokenPayload reads the token from the query string", async () => {
  const result = await parseTokenPayload(
    new Request(`http://localhost/resolve-invitation?token=${TOKEN}`),
    tokenSchema,
  );

  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, { token: TOKEN });
});

/**
 * The client reaches these endpoints through `functions.invoke`, which posts a body and cannot
 * append a query string. Reading only the query string is what made every invitation resolve as
 * invalid while the token was perfectly good.
 */
Deno.test("parseTokenPayload reads the token from the body", async () => {
  const result = await parseTokenPayload(post({ token: TOKEN }), tokenSchema);

  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, { token: TOKEN });
});

Deno.test("parseTokenPayload refuses a malformed token before any lookup", async () => {
  for (const query of ["?token=", "?token=not-a-token"]) {
    const result = await parseTokenPayload(
      new Request(`http://localhost/resolve-invitation${query}`),
      tokenSchema,
    );
    assertEquals(result.ok, false, query);
  }

  assertEquals((await parseTokenPayload(post({ token: "nope" }), tokenSchema)).ok, false);
  assertEquals((await parseTokenPayload(post({}), tokenSchema)).ok, false);
});

// A request with neither falls through to the body parser, which is where the error belongs.
Deno.test("parseTokenPayload refuses a request carrying no token at all", async () => {
  const result = await parseTokenPayload(
    new Request("http://localhost/resolve-invitation", { method: "POST", body: "" }),
    tokenSchema,
  );

  assertEquals(result.ok, false);
});

Deno.test("internalError never returns the underlying failure to the caller", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = internalError(post({}), "invite-member", new Error("connection string leak"));

    assertEquals(response.status, 500);
    const body = await response.text();
    assertEquals(JSON.parse(body), { error: "internal_error" });
    assertEquals(body.includes("connection string leak"), false);
  } finally {
    console.error = originalError;
  }
});
