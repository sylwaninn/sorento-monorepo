const SESSION_KEY = "sorento:pendingConsentToken";

export const savePendingConsentToken = (token: string): void => {
  sessionStorage.setItem(SESSION_KEY, token);
};

export const getPendingConsentToken = (): string | null => sessionStorage.getItem(SESSION_KEY);

export const clearPendingConsentToken = (): void => {
  sessionStorage.removeItem(SESSION_KEY);
};
