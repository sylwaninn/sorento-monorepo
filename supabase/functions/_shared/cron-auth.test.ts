import { assertEquals, assertLess } from "jsr:@std/assert@1";
import { isAuthorizedCronRequest, matchesCronSecret } from "@shared/cron-auth.ts";

/**
 * These jobs run as service_role with no user to authenticate, so this comparison is the only
 * thing between a public URL and a batch that reads every dossier in the database.
 */

const SECRET = "local-dev-cron-secret";

Deno.test("matchesCronSecret accepts the exact secret", () => {
  assertEquals(matchesCronSecret(SECRET, SECRET), true);
});

Deno.test("matchesCronSecret rejects a wrong secret of the same length", () => {
  assertEquals(matchesCronSecret("local-dev-cron-secreT", SECRET), false);
});

Deno.test("matchesCronSecret rejects a prefix of the secret", () => {
  assertEquals(matchesCronSecret("local-dev", SECRET), false);
});

Deno.test("matchesCronSecret rejects a value that merely contains the secret", () => {
  assertEquals(matchesCronSecret(`${SECRET}-extra`, SECRET), false);
});

Deno.test("matchesCronSecret rejects a caller that sent no secret", () => {
  assertEquals(matchesCronSecret(null, SECRET), false);
});

// An unprovisioned secret must close the door, not open it. The opposite is the classic
// misconfiguration: the job deploys before its secret and is briefly world-callable.
Deno.test("matchesCronSecret denies when no secret is configured", () => {
  assertEquals(matchesCronSecret(SECRET, null), false);
  assertEquals(matchesCronSecret(null, null), false);
});

Deno.test("matchesCronSecret rejects the empty string against a configured secret", () => {
  assertEquals(matchesCronSecret("", SECRET), false);
});

/**
 * The comparison reads every byte regardless of where the mismatch is. A timing test cannot be
 * made deterministic, so this asserts the property that makes constant time possible: the cost
 * of a first-byte mismatch and a last-byte mismatch stay within the same order of magnitude.
 */
Deno.test("matchesCronSecret does not return early on the first differing byte", () => {
  const long = "x".repeat(4096);
  const differsFirst = `y${"x".repeat(4095)}`;
  const differsLast = `${"x".repeat(4095)}y`;

  const measure = (candidate: string): number => {
    const started = performance.now();
    for (let run = 0; run < 2000; run += 1) matchesCronSecret(candidate, long);
    return performance.now() - started;
  };

  // Warm up so the first measurement does not pay for JIT compilation.
  measure(differsFirst);

  const early = measure(differsFirst);
  const late = measure(differsLast);

  assertLess(Math.max(early, late) / Math.max(Math.min(early, late), 0.0001), 10);
});

// CRON_SECRET is pinned to SECRET in supabase/functions/.env.test, which is what lets this
// assert the allowed path rather than only the denials.
const cronRequest = (headers: Record<string, string>): Request =>
  new Request("http://localhost/daily-reminders", { method: "POST", headers });

Deno.test("isAuthorizedCronRequest admits a request carrying the configured secret", () => {
  assertEquals(isAuthorizedCronRequest(cronRequest({ "x-cron-secret": SECRET })), true);
});

Deno.test("isAuthorizedCronRequest reads no header other than x-cron-secret", () => {
  assertEquals(isAuthorizedCronRequest(cronRequest({})), false);
  assertEquals(isAuthorizedCronRequest(cronRequest({ authorization: `Bearer ${SECRET}` })), false);
  assertEquals(isAuthorizedCronRequest(cronRequest({ "x-cron-secret": "guessed" })), false);
});
