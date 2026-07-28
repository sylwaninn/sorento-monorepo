import { describe, expect, it } from "vitest";
import { LOCAL_ANON_KEY, LOCAL_SUPABASE_URL } from "#client/integration-tests/env";

/**
 * The thirteen Edge Functions over real HTTP, against the local stack.
 *
 * They run as service_role: whatever they are willing to do for an unauthenticated caller, they
 * do with every RLS policy bypassed. `deno check` proves they compile and the _shared suites
 * prove the guards decide correctly in isolation — neither proves a guard is actually wired into
 * a given endpoint, which is the mistake that matters. This suite asks each function the only
 * question an attacker asks: what do you do for someone who is nobody?
 *
 * The happy paths belong to the E2E journeys, which drive them through the app with a real
 * session. What is asserted here is refusal, and the shape of it.
 */

type Guard = "jwt" | "cron" | "token" | "development";

interface EdgeFunction {
  name: string;
  guard: Guard;
}

/**
 * Mirrors the [functions.*] blocks in supabase/config.toml. A function added there without a
 * line here is caught by scripts/check-tests.mjs, which refuses an Edge Function no test names.
 */
const FUNCTIONS: readonly EdgeFunction[] = [
  { name: "accept-invitation", guard: "jwt" },
  { name: "invite-member", guard: "jwt" },
  { name: "designate-trusted-contact", guard: "jwt" },
  { name: "consent-trusted-contact", guard: "jwt" },
  { name: "oppose-dossier-activation", guard: "jwt" },
  { name: "resolve-invitation", guard: "token" },
  { name: "resolve-trusted-contact-activation", guard: "token" },
  { name: "request-dossier-activation", guard: "token" },
  { name: "send-pending-emails", guard: "cron" },
  { name: "daily-reminders", guard: "cron" },
  { name: "process-dossier-activations", guard: "cron" },
  { name: "weekly-digest", guard: "cron" },
  { name: "dev-signup", guard: "development" },
];

const endpoint = (name: string): string => `${LOCAL_SUPABASE_URL}/functions/v1/${name}`;

const call = async (
  name: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
): Promise<Response> =>
  fetch(endpoint(name), {
    method: init.method ?? "POST",
    headers: {
      apikey: LOCAL_ANON_KEY,
      "Content-Type": "application/json",
      ...init.headers,
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });

const byGuard = (guard: Guard): EdgeFunction[] => FUNCTIONS.filter((fn) => fn.guard === guard);

describe.each(FUNCTIONS)("$name", ({ name }) => {
  it("answers the CORS preflight", async () => {
    const response = await fetch(endpoint(name), {
      method: "OPTIONS",
      headers: { apikey: LOCAL_ANON_KEY, Origin: "http://localhost:5173" },
    });

    expect(response.status).toBe(200);
  });

  it("never answers a nobody with a server error", async () => {
    const response = await call(name, { body: {} });

    // A 5xx on an unauthenticated call means the guard ran after something that could throw.
    expect(response.status).toBeLessThan(500);
  });
});

/**
 * Characterisation, not approval.
 *
 * _shared/http.ts pins Access-Control-Allow-Origin to the app's own origin, and the unit suite
 * proves it never reflects a foreign one. Reached through the Supabase gateway, that header is
 * replaced by `*` before it leaves the stack, so the pinning is inert in practice and CORS is
 * not a boundary anything here may rely on. The guards asserted below — JWT, cron secret,
 * token, environment — are the real ones.
 *
 * This test exists so the day the platform stops overriding the header is a visible failure and
 * a decision, rather than something nobody notices.
 */
describe("CORS through the gateway", () => {
  it("is answered with a wildcard, overriding the origin the function pins", async () => {
    const response = await fetch(endpoint("invite-member"), {
      method: "OPTIONS",
      headers: { apikey: LOCAL_ANON_KEY, Origin: "https://attacker.example" },
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe.each(byGuard("jwt"))("$name refuses an unauthenticated caller", ({ name }) => {
  it("answers 401 with no Authorization header", async () => {
    expect((await call(name, { body: {} })).status).toBe(401);
  });

  it("answers 401 on a forged bearer token", async () => {
    const response = await call(name, {
      headers: { Authorization: "Bearer not-a-real-jwt" },
      body: {},
    });

    expect(response.status).toBe(401);
  });
});

describe.each(byGuard("cron"))("$name refuses a caller without the cron secret", ({ name }) => {
  it("answers 401 with no x-cron-secret header", async () => {
    expect((await call(name, { body: {} })).status).toBe(401);
  });

  it("answers 401 on a wrong secret", async () => {
    const response = await call(name, { headers: { "x-cron-secret": "guessed" }, body: {} });

    expect(response.status).toBe(401);
  });

  // The batch runs as service_role over every dossier; a user JWT must not be a way in.
  it("does not accept an Authorization header in place of the secret", async () => {
    const response = await call(name, {
      headers: { Authorization: `Bearer ${LOCAL_ANON_KEY}` },
      body: {},
    });

    expect(response.status).toBe(401);
  });
});

describe.each(byGuard("token"))("$name refuses an invalid token", ({ name }) => {
  it("rejects a malformed token before any lookup", async () => {
    const response = await call(name, { body: { token: "not-a-token" } });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it("does not confirm whether a well-formed token exists", async () => {
    const response = await call(name, { body: { token: "a".repeat(64) } });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});

/**
 * The development gate, checked against the stack the tests actually run on. APP_ENV lives only
 * in the gitignored supabase/functions/.env, so unless a developer opted in locally this
 * endpoint is shut — which is the state every deployed environment is in permanently.
 */
describe.each(byGuard("development"))("$name is gated on the environment", ({ name }) => {
  /**
   * The gate is open on a developer machine that opted in through the gitignored
   * supabase/functions/.env, and shut everywhere else — including CI, which never writes that
   * file. Both states are legitimate, so the suite reads which one it is running against and
   * then holds it to the matching contract, rather than skipping when the door is open.
   */
  const gateState = async (): Promise<"open" | "closed"> => {
    const response = await call(name, {
      body: { email: `gate-${Date.now()}@example.test`, password: "TestPassword1234!" },
    });
    await response.body?.cancel();
    return response.status === 404 ? "closed" : "open";
  };

  it("answers 404 rather than admitting the endpoint exists, or creates the account", async () => {
    const response = await call(name, {
      body: { email: `gate-${Date.now()}@example.test`, password: "TestPassword1234!" },
    });

    // Never a 403: a caller on a deployed environment must not learn the endpoint is there.
    expect([200, 404]).toContain(response.status);
    if (response.status === 404) {
      expect(await response.json()).toEqual({ error: "not_found" });
    } else {
      await response.body?.cancel();
    }
  });

  // A 400 invalid_json from a shut gate would prove the body was parsed first, which would put
  // whatever parsed it in front of the only thing protecting a service_role account creation.
  it("decides on the environment before it reads the request body", async () => {
    const state = await gateState();
    const response = await call(name, { body: "{ not json" });
    const status = response.status;
    await response.body?.cancel();

    expect(status).toBe(state === "closed" ? 404 : 400);
  });
});

describe("Edge Function inventory", () => {
  it("names every function the repository declares", async () => {
    const responses = await Promise.all(
      FUNCTIONS.map(async (fn) => ({
        name: fn.name,
        status: (
          await fetch(endpoint(fn.name), {
            method: "OPTIONS",
            headers: { apikey: LOCAL_ANON_KEY },
          })
        ).status,
      })),
    );

    // A 404 here means the function is listed in this suite but no longer deployed by the
    // stack — the test would otherwise keep passing against an endpoint that does not exist.
    expect(responses.filter((entry) => entry.status === 404)).toEqual([]);
  });
});
