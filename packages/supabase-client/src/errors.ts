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

export const requireRow = <T>(data: T | null, error: unknown, context: string): T => {
  assertNoError(error, context);
  if (data === null) {
    throw new SupabaseRepositoryError(`Supabase call failed: ${context} (no row returned)`, error);
  }
  return data;
};
