import { assertEquals } from "jsr:@std/assert@1";
import {
  acceptInvitationPayloadSchema,
  applicationTokenSchema,
  inviteMemberPayloadSchema,
  opposeActivationPayloadSchema,
  requestActivationPayloadSchema,
} from "@shared/schemas.ts";

const TOKEN = "a".repeat(64);
const DOSSIER_ID = "00000000-0000-4000-8000-000000000001";

const accepts = (schema: { safeParse: (input: unknown) => { success: boolean } }, input: unknown) =>
  schema.safeParse(input).success;

/**
 * These schemas are the boundary of the service_role side: every payload is parsed here before
 * a single row is read. A shape that slips through reaches a database lookup performed with
 * privileges the caller does not have.
 */

Deno.test("applicationTokenSchema accepts exactly what generateToken produces", () => {
  assertEquals(accepts(applicationTokenSchema, TOKEN), true);
  assertEquals(accepts(applicationTokenSchema, "A".repeat(64)), false);
  assertEquals(accepts(applicationTokenSchema, "a".repeat(63)), false);
  assertEquals(accepts(applicationTokenSchema, "a".repeat(65)), false);
  assertEquals(accepts(applicationTokenSchema, ""), false);
});

// A token reaching a `.eq("token_hash", ...)` lookup with SQL-ish or wildcard characters is the
// shape this constraint exists to make impossible.
Deno.test("applicationTokenSchema refuses anything but lowercase hex", () => {
  for (const candidate of [
    `${"a".repeat(63)}%`,
    `${"a".repeat(62)}' '`,
    "../../etc/passwd",
    `${"a".repeat(63)}\n`,
  ]) {
    assertEquals(accepts(applicationTokenSchema, candidate), false, candidate);
  }
});

Deno.test("acceptInvitationPayloadSchema requires the token and nothing else", () => {
  assertEquals(accepts(acceptInvitationPayloadSchema, { token: TOKEN }), true);
  assertEquals(accepts(acceptInvitationPayloadSchema, {}), false);
  assertEquals(accepts(acceptInvitationPayloadSchema, { token: null }), false);
});

Deno.test("inviteMemberPayloadSchema follows the domain rule on invitable roles", () => {
  const base = { dossierId: DOSSIER_ID, email: "proche@example.test" };

  assertEquals(accepts(inviteMemberPayloadSchema, { ...base, role: "collaborator" }), true);
  assertEquals(accepts(inviteMemberPayloadSchema, { ...base, role: "viewer" }), true);
  // Ownership is transferred, never invited.
  assertEquals(accepts(inviteMemberPayloadSchema, { ...base, role: "owner" }), false);
  assertEquals(accepts(inviteMemberPayloadSchema, { ...base, role: "trusted_contact" }), false);
});

Deno.test("inviteMemberPayloadSchema refuses an address that is not an email", () => {
  const base = { dossierId: DOSSIER_ID, role: "viewer" };

  assertEquals(accepts(inviteMemberPayloadSchema, { ...base, email: "proche" }), false);
  assertEquals(accepts(inviteMemberPayloadSchema, { ...base, email: "" }), false);
});

Deno.test("requestActivationPayloadSchema wants a calendar day, not an instant", () => {
  const base = { token: TOKEN };

  assertEquals(accepts(requestActivationPayloadSchema, { ...base, deathDate: "2026-05-04" }), true);
  assertEquals(
    accepts(requestActivationPayloadSchema, {
      ...base,
      deathDate: "2026-05-04T08:00:00.000+00:00",
    }),
    false,
  );
  assertEquals(
    accepts(requestActivationPayloadSchema, { ...base, deathDate: "04/05/2026" }),
    false,
  );
});

/**
 * The path is written by the client and then read back through Storage, so it is the one string
 * in these payloads that could walk out of the bucket prefix the policies rely on.
 */
Deno.test(
  "requestActivationPayloadSchema constrains the document path to the bucket layout",
  () => {
    const base = { token: TOKEN, deathDate: "2026-05-04" };
    const valid = `${DOSSIER_ID}/acte-de-deces/${DOSSIER_ID}.pdf`;

    assertEquals(accepts(requestActivationPayloadSchema, { ...base, documentPath: valid }), true);

    for (const hostile of [
      `../${DOSSIER_ID}/acte-de-deces/${DOSSIER_ID}.pdf`,
      `${DOSSIER_ID}/../../secrets/${DOSSIER_ID}.pdf`,
      `${DOSSIER_ID}/acte-de-deces/${DOSSIER_ID}.exe`,
      `${DOSSIER_ID}/acte-de-deces/${DOSSIER_ID}.pdf.exe`,
      "acte.pdf",
      "",
    ]) {
      assertEquals(
        accepts(requestActivationPayloadSchema, { ...base, documentPath: hostile }),
        false,
        hostile,
      );
    }
  },
);

Deno.test("requestActivationPayloadSchema treats the document as optional", () => {
  assertEquals(
    accepts(requestActivationPayloadSchema, { token: TOKEN, deathDate: "2026-05-04" }),
    true,
  );
});

Deno.test("opposeActivationPayloadSchema bounds the free-text reason", () => {
  assertEquals(accepts(opposeActivationPayloadSchema, { dossierId: DOSSIER_ID }), true);
  assertEquals(
    accepts(opposeActivationPayloadSchema, { dossierId: DOSSIER_ID, reason: "x" }),
    true,
  );
  assertEquals(
    accepts(opposeActivationPayloadSchema, { dossierId: DOSSIER_ID, reason: "x".repeat(2001) }),
    false,
  );
  assertEquals(accepts(opposeActivationPayloadSchema, { dossierId: "dossier-1" }), false);
});
