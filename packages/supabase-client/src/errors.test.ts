import { describe, expect, it } from "vitest";
import {
  SupabaseRepositoryError,
  assertNoError,
  assertNoFunctionError,
  requireRow,
} from "#client/errors";

describe("assertNoError", () => {
  it("lets a successful call through", () => {
    expect(() => assertNoError(null, "listDossiers")).not.toThrow();
  });

  it("names the failing call so the log points at one query", () => {
    expect(() => assertNoError({ message: "permission denied" }, "listDossiers")).toThrow(
      /listDossiers/,
    );
  });

  // The original PostgREST error carries the RLS refusal; losing it turns "policy denied this"
  // into an untraceable generic failure.
  it("keeps the original error as the cause", () => {
    const cause = { code: "42501", message: "permission denied" };

    try {
      assertNoError(cause, "listDossiers");
      expect.unreachable("assertNoError should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseRepositoryError);
      expect((error as SupabaseRepositoryError).cause).toBe(cause);
    }
  });
});

describe("requireRow", () => {
  it("returns the row when there is one", () => {
    expect(requireRow({ id: "abc" }, null, "getDossier")).toEqual({ id: "abc" });
  });

  it("throws on the underlying error before it looks at the data", () => {
    expect(() => requireRow(null, { message: "boom" }, "getDossier")).toThrow(/getDossier/);
  });

  // An RLS-filtered read succeeds and returns nothing. A caller that asked for a row it must
  // have needs that to be an error, not a null it will dereference two lines later.
  it("throws when the query succeeded but matched no row", () => {
    expect(() => requireRow(null, null, "getDossier")).toThrow(/no row returned/);
  });

  it("returns a falsy row rather than treating it as absent", () => {
    expect(requireRow(0, null, "countDossiers")).toBe(0);
    expect(requireRow(false, null, "hasAccess")).toBe(false);
  });
});

/**
 * A refusal from an Edge Function carries its reason in the body, and functions-js never reads
 * it: the error it reports only holds the Response. Unread, every code the app has a French
 * sentence for was lost one layer below the screen, and the person met the generic sentence
 * instead of being told their link had expired.
 */
describe("assertNoFunctionError", () => {
  const httpError = (body: unknown, contentType = "application/json") => ({
    name: "FunctionsHttpError",
    context: new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status: 404,
      headers: { "Content-Type": contentType },
    }),
  });

  it("does nothing when the call succeeded", async () => {
    await expect(assertNoFunctionError(null, "accept invitation")).resolves.toBeUndefined();
  });

  it("carries the function's own reason into the message", async () => {
    await expect(
      assertNoFunctionError(httpError({ error: "invalid_or_expired" }), "accept invitation"),
    ).rejects.toThrow(/accept invitation: invalid_or_expired/);
  });

  it("keeps the original error as the cause, so a log still has the response", async () => {
    const original = httpError({ error: "email_mismatch" });

    await expect(assertNoFunctionError(original, "accept invitation")).rejects.toMatchObject({
      cause: original,
    });
  });

  // The body is read from a clone: a caller inspecting the response afterwards must not find it
  // already consumed.
  it("leaves the response body readable by whoever else wants it", async () => {
    const original = httpError({ error: "already_active" });

    await expect(assertNoFunctionError(original, "request activation")).rejects.toThrow();
    await expect(original.context.json()).resolves.toEqual({ error: "already_active" });
  });

  it("still fails, without a reason, when the body is not JSON", async () => {
    await expect(
      assertNoFunctionError(httpError("<html>502</html>", "text/html"), "invite member"),
    ).rejects.toThrow(/Supabase call failed: invite member$/);
  });

  it("still fails, without a reason, when the JSON body names no error", async () => {
    await expect(
      assertNoFunctionError(httpError({ detail: "nope" }), "invite member"),
    ).rejects.toThrow(/Supabase call failed: invite member$/);
  });

  // A network failure never reaches a Response at all, and must not be swallowed.
  it("fails on an error carrying no response", async () => {
    await expect(assertNoFunctionError(new Error("offline"), "invite member")).rejects.toThrow(
      /Supabase call failed: invite member$/,
    );
  });
});
