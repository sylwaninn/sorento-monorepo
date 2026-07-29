import { describe, expect, it } from "vitest";
import { extractVariables, resolveLetterVariables } from "#core/letters";

describe("extractVariables", () => {
  it("extracts the unique variables of a template", () => {
    const template =
      "Hello {{senderName}}, death of {{deceasedName}} on {{deathDate}}. Regards {{senderName}}.";
    expect(extractVariables(template)).toEqual(["senderName", "deceasedName", "deathDate"]);
  });

  it("returns an empty array with no variable", () => {
    expect(extractVariables("No variable here.")).toEqual([]);
  });

  // Templates are hand-written, so the padding inside the braces is whatever the author typed.
  // Only whitespace is tolerated there: anything else is not a variable.
  it("tolerates spaces around the name", () => {
    expect(extractVariables("Hello {{ senderName }}.")).toEqual(["senderName"]);
  });

  it("tolerates padding on one side only", () => {
    expect(extractVariables("{{ left}} and {{right }}")).toEqual(["left", "right"]);
  });

  it("ignores a token padded with something other than whitespace", () => {
    expect(extractVariables("Hello {{name!}}.")).toEqual([]);
  });

  it("ignores a token with no name at all", () => {
    expect(extractVariables("Hello {{}}.")).toEqual([]);
  });

  it("ignores a single-braced token", () => {
    expect(extractVariables("Hello {name}.")).toEqual([]);
  });

  it("accepts digits and underscores in a name", () => {
    expect(extractVariables("{{address_line_2}}")).toEqual(["address_line_2"]);
  });
});

describe("resolveLetterVariables", () => {
  it("replaces every provided variable", () => {
    const { body, missingVariables } = resolveLetterVariables("Hello {{name}}, on {{date}}.", {
      name: "Jane Doe",
      date: "2026-03-01",
    });

    expect(body).toBe("Hello Jane Doe, on 2026-03-01.");
    expect(missingVariables).toEqual([]);
  });

  it("leaves the token visible and reports it for a missing or empty variable", () => {
    const { body, missingVariables } = resolveLetterVariables("Hello {{name}}, ref {{ref}}.", {
      name: "Jane Doe",
      ref: "",
    });

    expect(body).toBe("Hello Jane Doe, ref {{ref}}.");
    expect(missingVariables).toEqual(["ref"]);
  });

  it("reports a missing variable only once even if repeated", () => {
    const { missingVariables } = resolveLetterVariables("{{ref}} ... {{ref}}", {});
    expect(missingVariables).toEqual(["ref"]);
  });
});
