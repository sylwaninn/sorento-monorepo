import { SupabaseRepositoryError } from "@sorento/supabase-client";
import { authErrorMessage } from "@/auth/auth-error-messages";

const GENERIC = "Une erreur est survenue. Merci de réessayer dans quelques instants.";

// Codes and error strings the server can return that map to something a person can act on.
const MESSAGES_BY_MARKER: ReadonlyArray<readonly [RegExp, string]> = [
  [/42501|row-level security/i, "Vous n'avez pas les droits nécessaires pour cette action."],
  [/23505|duplicate key/i, "Cet élément existe déjà."],
  [
    /assigned_to must be an owner or collaborator/i,
    "Une démarche ne peut être confiée qu'à un titulaire ou à un collaborateur.",
  ],
  [/Comments cannot be edited/i, "Un commentaire ne peut pas être modifié, seulement supprimé."],
  [
    /only the current owner can transfer ownership/i,
    "Seul le titulaire peut transférer la titularité.",
  ],
  [
    /the new owner must already be a collaborator/i,
    "La titularité ne peut être transférée qu'à un collaborateur du dossier.",
  ],
  [/email_mismatch/i, "Ce lien a été envoyé à une autre adresse email que la vôtre."],
  [/invalid_or_expired/i, "Ce lien n'est plus valide : il a expiré ou a déjà été utilisé."],
  [/invitation_already_pending/i, "Une invitation est déjà en attente pour cette adresse."],
  [/activation_frozen/i, "L'activation de ce dossier est suspendue suite à une opposition."],
  [/activation_already_pending/i, "Une activation est déjà en cours pour ce dossier."],
  [/already_active/i, "Ce dossier est déjà actif."],
  [/failed to fetch|networkerror/i, "Connexion impossible. Vérifiez votre connexion internet."],
];

const asText = (error: unknown): string => {
  if (error instanceof SupabaseRepositoryError)
    return `${error.message} ${JSON.stringify(error.cause)}`;
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : JSON.stringify(error);
};

/**
 * Technical failures never reach the screen verbatim. Auth errors keep their own dictionary;
 * everything else is matched against the handful of server responses a user can act on, and
 * falls back to a neutral sentence.
 */
export const userFacingErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    !(error instanceof SupabaseRepositoryError)
  ) {
    const authMessage = authErrorMessage(error);
    if (authMessage !== "Une erreur est survenue. Merci de réessayer dans quelques instants.") {
      return authMessage;
    }
  }

  const text = asText(error);
  return MESSAGES_BY_MARKER.find(([pattern]) => pattern.test(text))?.[1] ?? GENERIC;
};
