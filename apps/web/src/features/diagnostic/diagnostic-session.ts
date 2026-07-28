import type { DiagnosticAnswers } from "@sorento/domain";

const SESSION_KEY = "sorento:diagnostic";

export const loadAnswersFromSession = (): DiagnosticAnswers => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as DiagnosticAnswers) : {};
  } catch {
    return {};
  }
};

export const saveAnswersToSession = (answers: DiagnosticAnswers): void => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(answers));
};

export const clearAnswersFromSession = (): void => {
  sessionStorage.removeItem(SESSION_KEY);
};
