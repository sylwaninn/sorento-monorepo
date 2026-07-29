import { describe, expect, it } from "vitest";
import { SupabaseRepositoryError, assertNoError, requireRow } from "#client/errors";

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
