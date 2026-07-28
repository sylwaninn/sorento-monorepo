import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_QUESTIONS, applicableQuestions } from "#core/diagnostic";

/**
 * The catalogue is written out again here rather than derived from DIAGNOSTIC_QUESTIONS: a test
 * that reads the list it is checking passes whatever the list says. This copy is what makes a
 * silently renamed id or a dropped option fail — and both matter, because the ids key the
 * answers the eligibility rules read, and the options key the French labels in apps/web.
 */
const EXPECTED = [
  { id: "mode", type: "single_choice", options: ["death", "preparation"] },
  { id: "fullName", type: "text", options: undefined },
  { id: "deathDate", type: "date", options: undefined },
  {
    id: "maritalStatus",
    type: "single_choice",
    options: ["married", "civilUnion", "cohabiting", "single", "divorced"],
  },
  { id: "survivingSpouseAge", type: "number", options: undefined },
  {
    id: "employmentStatus",
    type: "single_choice",
    options: ["employee", "retired", "selfEmployed", "jobseeker", "unemployed"],
  },
  { id: "ownsVehicle", type: "boolean", options: undefined },
  { id: "housingStatus", type: "single_choice", options: ["tenant", "owner", "hosted"] },
  { id: "hasMinorChildren", type: "boolean", options: undefined },
];

describe("DIAGNOSTIC_QUESTIONS", () => {
  it("asks exactly these questions, in this order", () => {
    expect(DIAGNOSTIC_QUESTIONS.map((question) => question.id)).toEqual(
      EXPECTED.map((question) => question.id),
    );
  });

  it.each(EXPECTED)("asks $id as a $type", ({ id, type }) => {
    expect(DIAGNOSTIC_QUESTIONS.find((question) => question.id === id)?.type).toBe(type);
  });

  it.each(EXPECTED.filter((question) => question.options !== undefined))(
    "offers exactly the listed choices for $id",
    ({ id, options }) => {
      expect(DIAGNOSTIC_QUESTIONS.find((question) => question.id === id)?.options).toEqual(options);
    },
  );

  it.each(EXPECTED.filter((question) => question.options === undefined))(
    "offers no choice list for $id",
    ({ id }) => {
      expect(DIAGNOSTIC_QUESTIONS.find((question) => question.id === id)?.options).toBeUndefined();
    },
  );

  it("starts by asking whether a death has occurred, since everything branches on it", () => {
    expect(DIAGNOSTIC_QUESTIONS[0]?.id).toBe("mode");
  });
});

describe("conditional questions", () => {
  // Only two questions branch; every other one is asked of everybody. Getting this wrong
  // either hides a question that drives an entitlement, or asks a bereaved person for a death
  // date they have already given.
  const CONDITIONAL = ["deathDate", "survivingSpouseAge"];

  it.each(CONDITIONAL)("makes %s conditional", (id) => {
    expect(DIAGNOSTIC_QUESTIONS.find((question) => question.id === id)?.condition).toBeDefined();
  });

  it.each(EXPECTED.map((question) => question.id).filter((id) => !CONDITIONAL.includes(id)))(
    "asks %s of everyone",
    (id) => {
      expect(
        DIAGNOSTIC_QUESTIONS.find((question) => question.id === id)?.condition,
      ).toBeUndefined();
    },
  );

  it("asks the death date only after a death is declared", () => {
    expect(applicableQuestions({ mode: "death" }).some((q) => q.id === "deathDate")).toBe(true);
    expect(applicableQuestions({ mode: "preparation" }).some((q) => q.id === "deathDate")).toBe(
      false,
    );
  });

  it.each([
    ["married", true],
    ["civilUnion", true],
    ["cohabiting", false],
    ["single", false],
    ["divorced", false],
  ])("asks the surviving spouse's age for %s: %s", (maritalStatus, expected) => {
    expect(applicableQuestions({ maritalStatus }).some((q) => q.id === "survivingSpouseAge")).toBe(
      expected,
    );
  });
});
