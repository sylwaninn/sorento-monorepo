import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signupSchema } from "@sorento/domain";
import { SignupPage } from "@/features/auth/SignupPage";
import { VerifyEmailPage } from "@/features/auth/VerifyEmailPage";
import { authContent } from "@/features/auth/content";
import { supabase } from "@/lib/supabase-client";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";
import { must } from "@/test/must";

/**
 * The other half of the funnel. Two things here are not cosmetic: the account is created only
 * once the terms are actually accepted, and the person is told what happens next, because the
 * next step is in a mailbox and the screen alone cannot show it.
 */

const EMAIL = "camille@exemple.fr";
const SHORT_PASSWORD = "trop court";
const GOOD_PASSWORD = "un mot de passe assez long";

/**
 * Read back from the schema that refuses the input rather than copied out of it: the assertion
 * is that the boundary's own message reaches the field, whatever that message says today.
 */
const messageFor = (input: { password: string; acceptTerms: boolean }): string => {
  const parsed = signupSchema.safeParse({ email: EMAIL, ...input });
  if (parsed.success) {
    throw new Error("Missing test input: the schema accepted what the test needs it to refuse.");
  }
  return must(parsed.error.issues[0], "the first issue the schema raised").message;
};

const renderPage = () =>
  renderWithProviders(<SignupPage />, {
    route: "/inscription",
    path: "/inscription",
    siblings: [{ path: "/verification-email", element: <VerifyEmailPage /> }],
  });

const fillIn = async ({ password }: { password: string }): Promise<void> => {
  await userEvent.type(screen.getByRole("textbox", { name: authContent.signup.emailLabel }), EMAIL);
  await userEvent.type(screen.getByLabelText(authContent.signup.passwordLabel), password);
};

const submit = async (): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name: authContent.signup.submitButton }));
};

describe("SignupPage", () => {
  it("asks for the terms to be accepted explicitly, never by implication", () => {
    renderPage();

    expect(screen.getByRole("checkbox", { name: authContent.signup.termsLabel })).not.toBeChecked();
  });

  /**
   * The password rule lives in @sorento/domain and is what the database and the auth provider
   * are configured against. A screen that lets a shorter one through only moves the refusal to
   * a place where it reads as a server error.
   */
  it("refuses a password the schema refuses, and says why on the field", async () => {
    // Mocked as a success on purpose: if the boundary check ever stopped running, the screen
    // would move on to the confirmation page, and the absence below is what catches that.
    vi.spyOn(supabase.auth, "signUp").mockResolvedValue({
      data: { user: signedInSession().user, session: signedInSession() },
      error: null,
    });
    renderPage();

    await fillIn({ password: SHORT_PASSWORD });
    await userEvent.click(screen.getByRole("checkbox", { name: authContent.signup.termsLabel }));
    await submit();

    expect(
      await screen.findByText(messageFor({ password: SHORT_PASSWORD, acceptTerms: true })),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: authContent.verifyEmail.title }),
    ).not.toBeInTheDocument();
  });

  /**
   * Where the person is sent matters more than the call: the confirmation email is the only
   * way forward, and a screen that stays put after a successful signup reads as a failure.
   */
  it("sends the new account holder to the screen that explains the confirmation email", async () => {
    const signUp = vi.spyOn(supabase.auth, "signUp").mockResolvedValue({
      data: { user: signedInSession().user, session: signedInSession() },
      error: null,
    });
    renderPage();

    await fillIn({ password: GOOD_PASSWORD });
    await userEvent.click(screen.getByRole("checkbox", { name: authContent.signup.termsLabel }));
    await submit();

    expect(signUp).toHaveBeenCalled();
    expect(
      await screen.findByRole("heading", { name: authContent.verifyEmail.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(authContent.verifyEmail.description)).toBeInTheDocument();
  });

  it("leads back to the login screen for someone who already has an account", () => {
    renderPage();

    expect(screen.getByRole("link", { name: authContent.signup.loginLink })).toHaveAttribute(
      "href",
      "/connexion",
    );
  });
});
