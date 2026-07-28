const SESSION_KEY = "sorento:pendingConsentToken";

export const savePendingConsentToken = (token: string): void => {
  sessionStorage.setItem(SESSION_KEY, token);
};

export const takePendingConsentToken = (): string | null => {
  const token = sessionStorage.getItem(SESSION_KEY);
  if (token) sessionStorage.removeItem(SESSION_KEY);
  return token;
};
