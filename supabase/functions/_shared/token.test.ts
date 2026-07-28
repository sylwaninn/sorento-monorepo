import { assert, assertEquals, assertMatch, assertNotEquals } from "jsr:@std/assert@1";
import { generateToken, hashToken } from "@shared/token.ts";

/**
 * Invitation and activation links are bearer credentials: whoever holds the token acts as the
 * person it was sent to. Only the hash is stored, so the two properties that keep that safe are
 * that the token is unguessable and that the hash is a one-way, stable function of it.
 */

Deno.test("generateToken produces 32 bytes of hex", () => {
  assertMatch(generateToken(), /^[0-9a-f]{64}$/);
});

Deno.test("generateToken never repeats itself", () => {
  const tokens = new Set(Array.from({ length: 500 }, () => generateToken()));

  assertEquals(tokens.size, 500);
});

Deno.test("hashToken matches the published SHA-256 vector", async () => {
  // The canonical SHA-256 of "abc". Asserting against an independent vector rather than
  // against another call of the same function is what makes this a test of the algorithm.
  assertEquals(
    await hashToken("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

Deno.test("hashToken is stable across calls", async () => {
  const token = generateToken();

  assertEquals(await hashToken(token), await hashToken(token));
});

Deno.test("hashToken separates tokens that differ by one character", async () => {
  const first = "a".repeat(64);
  const second = `${"a".repeat(63)}b`;

  assertNotEquals(await hashToken(first), await hashToken(second));
});

Deno.test("hashToken never returns the token it was given", async () => {
  const token = generateToken();
  const hash = await hashToken(token);

  assert(hash !== token);
  assertMatch(hash, /^[0-9a-f]{64}$/);
});
