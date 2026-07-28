import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiagnosticWizardPage } from "@/features/diagnostic/DiagnosticWizardPage";
import type { QuestionContent } from "@/features/diagnostic/QuestionField";
import { diagnosticContent } from "@/features/diagnostic/content";
import { loadAnswersFromSession } from "@/features/diagnostic/diagnostic-session";
import { renderWithProviders } from "@/test/render";
import { must } from "@/test/must";

/**
 * Read through `must` rather than with a fallback: a question or an option removed from the
 * copy dictionary has to fail here, not turn the assertion into an empty-string comparison
 * that keeps passing over a screen that no longer shows anything.
 *
 * Widened to a plain record on the way in: the dictionary's literal type would make an id the
 * copy no longer defines a compile error, which sounds stricter but is not — the point is to
 * catch the removal at the assertion that depended on it, with the question named.
 */
const QUESTIONS: Record<string, QuestionContent | undefined> = diagnosticContent.questions;

const questionTitle = (questionId: string): string =>
  must(QUESTIONS[questionId], `question ${questionId}`).title;

const optionLabel = (questionId: string, optionId: string): string => {
  const question = must(QUESTIONS[questionId], `question ${questionId}`);
  return must(must(question.options, `options of ${questionId}`)[optionId], `option ${optionId}`);
};

const chooseOption = async (questionId: string, optionId: string): Promise<void> => {
  await userEvent.click(screen.getByRole("radio", { name: optionLabel(questionId, optionId) }));
};

const goNext = async (): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name: diagnosticContent.page.nextButton }));
};

describe("DiagnosticWizardPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("opens on the first question with the back button unavailable", () => {
    renderWithProviders(<DiagnosticWizardPage />, { route: "/diagnostic", path: "/diagnostic" });

    expect(screen.getByText(questionTitle("mode"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: diagnosticContent.page.backButton })).toBeDisabled();
  });

  it("keeps the next button disabled until the question is answered", async () => {
    renderWithProviders(<DiagnosticWizardPage />, { route: "/diagnostic", path: "/diagnostic" });

    expect(screen.getByRole("button", { name: diagnosticContent.page.nextButton })).toBeDisabled();

    await chooseOption("mode", "death");

    expect(screen.getByRole("button", { name: diagnosticContent.page.nextButton })).toBeEnabled();
  });

  it("persists answers to the session so a refresh loses nothing", async () => {
    renderWithProviders(<DiagnosticWizardPage />, { route: "/diagnostic", path: "/diagnostic" });

    await chooseOption("mode", "death");

    expect(loadAnswersFromSession()["mode"]).toBe("death");
  });

  it("skips the death date question in preparation mode", async () => {
    renderWithProviders(<DiagnosticWizardPage />, { route: "/diagnostic", path: "/diagnostic" });

    await chooseOption("mode", "preparation");
    await goNext();

    // The engine, not the component, decides that "when did it happen" no longer applies.
    expect(screen.getByText(questionTitle("fullName"))).toBeInTheDocument();
    expect(screen.queryByText(questionTitle("deathDate"))).not.toBeInTheDocument();
  });

  it("goes back to the previous question without losing the answer", async () => {
    renderWithProviders(<DiagnosticWizardPage />, { route: "/diagnostic", path: "/diagnostic" });

    await chooseOption("mode", "preparation");
    await goNext();
    await userEvent.click(screen.getByRole("button", { name: diagnosticContent.page.backButton }));

    expect(screen.getByText(questionTitle("mode"))).toBeInTheDocument();
    expect(loadAnswersFromSession()["mode"]).toBe("preparation");
  });
});
