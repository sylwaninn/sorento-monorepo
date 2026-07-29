import type { Session, User } from "@sorento/supabase-client";

/**
 * Test double for the whole data layer.
 *
 * Every repository method and every auth call returns a promise that never settles, so react-query
 * stays pending and each screen renders its loading branch. That is deliberate: the smoke suite
 * exists to prove a screen can mount at all (its imports resolve, its hooks run in a stable
 * order, the providers it expects are there), and a fixture per screen would only add a second
 * thing that can be wrong. Loaded-state behaviour belongs in the screen's own test, and the
 * real round trip belongs in E2E.
 */

const never = (): Promise<never> => new Promise<never>(() => {});

/**
 * Any property read off the instance is a method returning a pending promise. Built as a Proxy
 * rather than a hand-written double so a repository gaining a method needs no change here.
 */
const stubRepositoryClass = (): unknown =>
  class {
    constructor() {
      return new Proxy(this, {
        get: (_target, property) => (typeof property === "string" ? never : undefined),
      });
    }
  };

const stubSupabaseClient = (): unknown => ({
  auth: {
    getSession: never,
    getUser: never,
    signUp: never,
    signInWithPassword: never,
    signInWithOtp: never,
    signOut: never,
    resend: never,
    resetPasswordForEmail: never,
    updateUser: never,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  functions: { invoke: never },
});

/**
 * Replaces every `*Repository` export and the client factory, and leaves everything else
 * (the error type screens match on, the type-only exports) untouched.
 */
export const stubDataLayer = (actual: Record<string, unknown>): Record<string, unknown> => ({
  ...Object.fromEntries(
    Object.entries(actual).map(([name, value]) =>
      name.endsWith("Repository") ? [name, stubRepositoryClass()] : [name, value],
    ),
  ),
  createBrowserSupabaseClient: stubSupabaseClient,
  createServiceRoleSupabaseClient: stubSupabaseClient,
});

const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";

/** Minimal signed-in state: enough for the guards, no more than the screens actually read. */
export const signedInSession = (): Session =>
  ({
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: TEST_USER_ID,
      email: "test@example.test",
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: { first_name: "Camille" },
      created_at: "2026-01-01T00:00:00.000+00:00",
    } as User,
  }) as Session;
