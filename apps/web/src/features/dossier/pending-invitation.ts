const SESSION_KEY = "sorento:pendingInvitationToken";

export const savePendingInvitationToken = (token: string): void => {
  sessionStorage.setItem(SESSION_KEY, token);
};

export const getPendingInvitationToken = (): string | null => sessionStorage.getItem(SESSION_KEY);

export const clearPendingInvitationToken = (): void => {
  sessionStorage.removeItem(SESSION_KEY);
};
