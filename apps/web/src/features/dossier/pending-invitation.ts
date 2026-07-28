const SESSION_KEY = "sorento:pendingInvitationToken";

export const savePendingInvitationToken = (token: string): void => {
  sessionStorage.setItem(SESSION_KEY, token);
};

export const takePendingInvitationToken = (): string | null => {
  const token = sessionStorage.getItem(SESSION_KEY);
  if (token) sessionStorage.removeItem(SESSION_KEY);
  return token;
};
