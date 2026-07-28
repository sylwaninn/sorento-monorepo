import type { z } from "zod";
import { env } from "@shared/env.ts";

// Pinned to the app origin rather than "*": these endpoints mutate state (invitations,
// activations), so any origin being able to call them from a logged-in browser is exactly
// what CORS exists to prevent.
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([env.siteUrl]);

/**
 * Echoes the caller's origin only when it is on the allow-list, and falls back to the app's own
 * origin otherwise, never to the request's. Exported with the list passed in so the case that
 * matters, a hostile origin asking to be reflected, can be asserted without a live request.
 */
export const resolveAllowedOrigin = (
  requestOrigin: string | null,
  allowed: ReadonlySet<string>,
  fallback: string,
): string => (requestOrigin !== null && allowed.has(requestOrigin) ? requestOrigin : fallback);

const corsHeaders = (request: Request): Record<string, string> => {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(origin, ALLOWED_ORIGINS, env.siteUrl),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

export const json = (request: Request, body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });

export const preflight = (request: Request): Response | null =>
  request.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders(request) }) : null;

export type Parsed<T> = { ok: true; value: T } | { ok: false; response: Response };

/**
 * Every payload crossing the boundary is parsed by a domain schema before anything reads it.
 * Failures come back as a flat field/message map so the client can surface them, and never
 * as a raw Zod dump.
 */
export const parseBody = async <T>(request: Request, schema: z.ZodType<T>): Promise<Parsed<T>> => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: json(request, { error: "invalid_json" }, 400) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_global";
      if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return { ok: false, response: json(request, { error: "invalid_request", fieldErrors }, 400) };
  }

  return { ok: true, value: result.data };
};

/**
 * Token lookups on the resolve endpoints, from either place a token can arrive.
 *
 * The query string comes from someone opening a link; the body comes from the client calling
 * `functions.invoke`, which is how the app actually reaches these endpoints and has no way to
 * append a query string. Reading only the query string made every resolve call answer
 * "invitation invalide ou expirée": the request was well-formed and the token was real, it was
 * simply being looked for somewhere it never is.
 */
export const parseTokenPayload = <T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<Parsed<T>> => {
  const fromQuery = new URL(request.url).searchParams.get("token");
  if (fromQuery === null) return parseBody(request, schema);

  const result = schema.safeParse({ token: fromQuery });
  return Promise.resolve(
    result.success
      ? { ok: true, value: result.data }
      : { ok: false, response: json(request, { error: "invalid_request" }, 400) },
  );
};

export const internalError = (request: Request, context: string, error: unknown): Response => {
  console.error(`${context} failed`, error);
  return json(request, { error: "internal_error" }, 500);
};
