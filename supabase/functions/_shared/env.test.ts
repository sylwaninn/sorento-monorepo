import { assertEquals } from "jsr:@std/assert@1";
import { env, isDevelopmentEnvironment, isLocalSupabaseUrl } from "@shared/env.ts";

/**
 * This gate is the whole security model of the development-only endpoints (SECURITY.md):
 * dev-signup creates confirmed accounts with service_role, and the only thing keeping it off a
 * real environment is `isDevelopment` being false there. Both signals are asserted apart and
 * together, because a gate that opens on either one alone is a gate that opens.
 */

Deno.test("isLocalSupabaseUrl recognises the hosts a local stack answers on", () => {
  for (const url of [
    "http://127.0.0.1:57321",
    "http://localhost:57321",
    "http://kong:8000",
    "http://host.docker.internal:57321",
    "http://supabase_kong_sorento-monorepo:8000",
  ]) {
    assertEquals(isLocalSupabaseUrl(url), true, url);
  }
});

Deno.test("isLocalSupabaseUrl rejects a deployed project URL", () => {
  assertEquals(isLocalSupabaseUrl("https://abcdefgh.supabase.co"), false);
});

// A hostname that merely contains a local host name is a different host. Substring matching
// here would make "localhost.attacker.example" look local.
Deno.test("isLocalSupabaseUrl matches the host, not a substring of it", () => {
  assertEquals(isLocalSupabaseUrl("https://localhost.attacker.example"), false);
  assertEquals(isLocalSupabaseUrl("https://not-localhost"), false);
  assertEquals(isLocalSupabaseUrl("https://127.0.0.1.attacker.example"), false);
});

Deno.test("isLocalSupabaseUrl refuses anything it cannot parse as a URL", () => {
  assertEquals(isLocalSupabaseUrl(""), false);
  assertEquals(isLocalSupabaseUrl("127.0.0.1"), false);
  assertEquals(isLocalSupabaseUrl("not a url"), false);
});

Deno.test("isDevelopmentEnvironment opens only when both signals agree", () => {
  assertEquals(isDevelopmentEnvironment("development", "http://127.0.0.1:57321"), true);
});

Deno.test("isDevelopmentEnvironment stays closed on a deployed URL", () => {
  assertEquals(isDevelopmentEnvironment("development", "https://abcdefgh.supabase.co"), false);
});

Deno.test("isDevelopmentEnvironment stays closed without the explicit opt-in", () => {
  assertEquals(isDevelopmentEnvironment(undefined, "http://127.0.0.1:57321"), false);
  assertEquals(isDevelopmentEnvironment("", "http://127.0.0.1:57321"), false);
});

// Anything other than the exact word: "dev", "DEVELOPMENT", "staging" must not unlock it.
Deno.test("isDevelopmentEnvironment matches APP_ENV exactly", () => {
  for (const appEnv of ["dev", "DEVELOPMENT", "development ", "staging", "production", "true"]) {
    assertEquals(isDevelopmentEnvironment(appEnv, "http://127.0.0.1:57321"), false, appEnv);
  }
});

// The test environment sets a local SUPABASE_URL and no APP_ENV, so the door is shut. A change
// that made the gate default to open would surface right here.
Deno.test("env.isDevelopment is closed unless APP_ENV was set", () => {
  assertEquals(env.isDevelopment, false);
});

Deno.test("env reads the app origin the environment declares", () => {
  assertEquals(env.siteUrl, "http://localhost:5173");
});
