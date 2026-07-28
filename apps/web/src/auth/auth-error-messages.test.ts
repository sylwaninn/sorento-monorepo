import { describe, expect, it } from "vitest";
import { AuthError } from "@sorento/supabase-client";
import { authErrorMessage } from "@/auth/auth-error-messages";

/**
 * The last thing standing between a person and an English technical string on the login screen.
 *
 * It had no test, and the reason is worth recording: apps/web may not import
 * @supabase/supabase-js (the boundaries rule), AuthError carries a protected member so no object
 * literal satisfies its type, and casts are forbidden. The class is now re-exported by
 * @sorento/supabase-client as a value, which is what makes these assertions possible at all.
 *
 * What is asserted is the property, not the dictionary: every entry produces something in French
 * that is not the fallback, and anything unmapped produces the fallback rather than the raw
 * message. A test enumerating the table again would only restate it.
 */

const authError = (code: string): AuthError =>
  new AuthError("Invalid login credentials", 400, code);

const MAPPED_CODES = [
  "invalid_credentials",
  "email_not_confirmed",
  "user_already_exists",
  "email_exists",
  "weak_password",
  "same_password",
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "signup_disabled",
];

const GENERIC = authErrorMessage(authError("a_code_that_will_never_exist"));

describe("authErrorMessage", () => {
  it.each(MAPPED_CODES)("says something of its own for %s", (code) => {
    const message = authErrorMessage(authError(code));

    expect(message).not.toBe(GENERIC);
    expect(message).not.toContain("Invalid login credentials");
  });

  it("gives distinct advice for a wrong password and an unconfirmed address", () => {
    // The two are the whole reason a login fails, and telling someone their password is wrong
    // when their account is simply unconfirmed sends them to reset a password that works.
    expect(authErrorMessage(authError("invalid_credentials"))).not.toBe(
      authErrorMessage(authError("email_not_confirmed")),
    );
  });

  it("falls back rather than repeating a message nobody wrote for a person", () => {
    expect(authErrorMessage(authError("unexpected_failure"))).toBe(GENERIC);
    expect(GENERIC).not.toContain("Invalid login credentials");
  });

  it("survives what a rejected promise can actually carry", () => {
    // The mutation hands over whatever the call rejected with, which is not always an AuthError.
    expect(authErrorMessage(new Error("boom"))).toBe(GENERIC);
    expect(authErrorMessage(null)).toBe(GENERIC);
    expect(authErrorMessage("network down")).toBe(GENERIC);
  });
});
