import { env } from "@shared/env.ts";

/** Compares every byte regardless of mismatch position, so timing leaks nothing. */
const secretsMatch = (a: string, b: string): boolean => {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
};

/**
 * The whole decision, with the secret passed in rather than read from the module: the gate
 * protecting the service_role jobs has to be assertable against a missing secret, an absent
 * header and a wrong value, and none of those states can be reached once `env` is fixed at
 * module load.
 *
 * An unset expected secret denies rather than allows: a job whose secret was never provisioned
 * must be unreachable, not open.
 */
export const matchesCronSecret = (provided: string | null, expected: string | null): boolean => {
  if (expected === null || provided === null) return false;
  return secretsMatch(provided, expected);
};

// These jobs run with service_role privileges and must not be publicly callable — guarded by
// a shared secret rather than a user JWT, since there is no user to verify_jwt as.
export const isAuthorizedCronRequest = (request: Request): boolean =>
  matchesCronSecret(request.headers.get("x-cron-secret"), env.cronSecret);
