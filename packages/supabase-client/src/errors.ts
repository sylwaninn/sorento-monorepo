export class SupabaseRepositoryError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "SupabaseRepositoryError";
    this.cause = cause;
  }
}

export const assertNoError = (error: unknown, context: string): void => {
  if (error) {
    throw new SupabaseRepositoryError(`Supabase call failed: ${context}`, error);
  }
};

/**
 * The same, for a call to an Edge Function, where the reason lives somewhere nothing was reading.
 *
 * functions-js reports a refusal as a FunctionsHttpError holding the Response, and never touches
 * the body. Our functions answer `{ "error": "invalid_or_expired" }` and similar, so the code the
 * app has a French sentence for was being dropped one layer below the screen: every refusal
 * arrived as the generic "une erreur est survenue", and the entries in the app's message table
 * for invalid_or_expired, email_mismatch, already_active and the rest could never match.
 *
 * The code is folded into the message rather than replacing it, so the context stays readable in
 * a log while the app can still match on the reason.
 */
export const assertNoFunctionError = async (error: unknown, context: string): Promise<void> => {
  if (!error) return;

  const response = (error as { context?: unknown }).context;
  let code: string | null = null;

  if (response instanceof Response) {
    try {
      const body: unknown = await response.clone().json();
      const reported = (body as { error?: unknown }).error;
      if (typeof reported === "string") code = reported;
    } catch {
      // A body that is not JSON tells us nothing more than the status already did.
    }
  }

  throw new SupabaseRepositoryError(
    code === null
      ? `Supabase call failed: ${context}`
      : `Supabase call failed: ${context}: ${code}`,
    error,
  );
};

export const requireRow = <T>(data: T | null, error: unknown, context: string): T => {
  assertNoError(error, context);
  if (data === null) {
    throw new SupabaseRepositoryError(`Supabase call failed: ${context} (no row returned)`, error);
  }
  return data;
};
