import { describe, expect, it } from "vitest";
import type { DiagnosticAnswers } from "@sorento/domain";
import {
  applicableQuestions,
  diagnosticProgress,
  isDiagnosticComplete,
  nextQuestion,
} from "#core/diagnostic";

describe("applicableQuestions", () => {
  it("hides deathDate until mode is 'death'", () => {
    const answers: DiagnosticAnswers = { mode: "preparation" };
    expect(applicableQuestions(answers).some((q) => q.id === "deathDate")).toBe(false);
  });

  it("reveals deathDate as soon as mode becomes 'death'", () => {
    const answers: DiagnosticAnswers = { mode: "death" };
    expect(applicableQuestions(answers).some((q) => q.id === "deathDate")).toBe(true);
  });

  it("hides survivingSpouseAge for a single person", () => {
    const answers: DiagnosticAnswers = { maritalStatus: "single" };
    expect(applicableQuestions(answers).some((q) => q.id === "survivingSpouseAge")).toBe(false);
  });

  it("reveals survivingSpouseAge when married or in a civil union", () => {
    expect(
      applicableQuestions({ maritalStatus: "married" }).some((q) => q.id === "survivingSpouseAge"),
    ).toBe(true);
    expect(
      applicableQuestions({ maritalStatus: "civilUnion" }).some(
        (q) => q.id === "survivingSpouseAge",
      ),
    ).toBe(true);
  });

  it("hides survivingSpouseAge for a cohabiting partner (no survivor pension right opened)", () => {
    expect(
      applicableQuestions({ maritalStatus: "cohabiting" }).some(
        (q) => q.id === "survivingSpouseAge",
      ),
    ).toBe(false);
  });
});

describe("nextQuestion / isDiagnosticComplete", () => {
  it("always starts with the mode question", () => {
    expect(nextQuestion({})?.id).toBe("mode");
  });

  it("advances one question at a time, never re-proposing an already-answered question", () => {
    const answers: DiagnosticAnswers = { mode: "preparation", fullName: "Jane Doe" };
    expect(nextQuestion(answers)?.id).toBe("maritalStatus");
  });

  it("skips deathDate in preparation mode and goes straight to maritalStatus", () => {
    const answers: DiagnosticAnswers = { mode: "preparation", fullName: "Jane Doe" };
    const question = nextQuestion(answers);
    expect(question?.id).not.toBe("deathDate");
    expect(question?.id).toBe("maritalStatus");
  });

  it("is never complete while an applicable question is unanswered", () => {
    expect(isDiagnosticComplete({ mode: "death" })).toBe(false);
  });

  it("is complete once every applicable question is answered (preparation, single)", () => {
    const answers: DiagnosticAnswers = {
      mode: "preparation",
      fullName: "Jane Doe",
      maritalStatus: "single",
      employmentStatus: "employee",
      ownsVehicle: false,
      housingStatus: "tenant",
      hasMinorChildren: false,
    };
    expect(isDiagnosticComplete(answers)).toBe(true);
    expect(nextQuestion(answers)).toBeNull();
  });

  it("is not complete in the same case when married (survivingSpouseAge missing)", () => {
    const answers: DiagnosticAnswers = {
      mode: "preparation",
      fullName: "Jane Doe",
      maritalStatus: "married",
      employmentStatus: "employee",
      ownsVehicle: false,
      housingStatus: "tenant",
      hasMinorChildren: false,
    };
    expect(isDiagnosticComplete(answers)).toBe(false);
    expect(nextQuestion(answers)?.id).toBe("survivingSpouseAge");
  });
});

describe("diagnosticProgress", () => {
  it("total follows branches dynamically (preparation: no deathDate)", () => {
    const { total } = diagnosticProgress({ mode: "preparation" });
    expect(total).toBe(QUESTIONS_COUNT_WITHOUT_DEATH_DATE_OR_AGE);
  });

  it("answered count increases with each answer", () => {
    const before = diagnosticProgress({ mode: "preparation" });
    const after = diagnosticProgress({ mode: "preparation", fullName: "Jane Doe" });
    expect(after.answered).toBe(before.answered + 1);
  });
});

// mode + fullName + maritalStatus + employmentStatus + ownsVehicle + housingStatus + hasMinorChildren
const QUESTIONS_COUNT_WITHOUT_DEATH_DATE_OR_AGE = 7;
