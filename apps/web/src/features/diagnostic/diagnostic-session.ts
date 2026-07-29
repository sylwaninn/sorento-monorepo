import { diagnosticAnswersSchema, type DiagnosticAnswers } from "@sorento/domain";

const SESSION_KEY = "sorento:diagnostic";

export const loadAnswersFromSession = (): DiagnosticAnswers => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = diagnosticAnswersSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
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
