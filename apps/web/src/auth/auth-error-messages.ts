import type { AuthError } from "@sorento/supabase-client";

const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: "Email ou mot de passe incorrect.",
  email_not_confirmed:
    "Cette adresse email n'est pas encore confirmée. Vérifiez votre boîte de réception.",
  user_already_exists: "Un compte existe déjà avec cette adresse email.",
  email_exists: "Un compte existe déjà avec cette adresse email.",
  weak_password:
    "Ce mot de passe est trop faible ou a été trouvé dans une fuite de données connue.",
  same_password: "Le nouveau mot de passe doit être différent de l'ancien.",
  over_email_send_rate_limit: "Trop de tentatives. Merci de patienter avant de réessayer.",
  over_request_rate_limit: "Trop de tentatives. Merci de patienter avant de réessayer.",
  signup_disabled: "Les inscriptions sont temporairement désactivées.",
};

const isAuthError = (error: unknown): error is AuthError =>
  typeof error === "object" && error !== null && "code" in error;

// Translates a Supabase Auth error into a French user message. Never a raw technical
// message on screen.
export const authErrorMessage = (error: unknown): string => {
  const message = isAuthError(error) && error.code ? MESSAGES_BY_CODE[error.code] : undefined;
  return message ?? "Une erreur est survenue. Merci de réessayer dans quelques instants.";
};
