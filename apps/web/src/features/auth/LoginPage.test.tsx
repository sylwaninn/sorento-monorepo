import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthError } from "@sorento/supabase-client";
import { LoginPage } from "@/features/auth/LoginPage";
import { authContent } from "@/features/auth/content";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { supabase } from "@/lib/supabase-client";
import { renderWithProviders } from "@/test/render";

/**
 * The front door. Everything past it is guarded by RequireAuth, so a login screen that offers
 * only one way in, or that swallows a magic link without saying anything, strands people
 * outside their own dossier with no way to tell what went wrong.
 */

const EMAIL = "camille@exemple.fr";

const renderPage = () =>
  renderWithProviders(<LoginPage />, { route: "/connexion", path: "/connexion" });

describe("LoginPage", () => {
  it("offers both ways in, and starts on the password one", async () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: authContent.login.submitButtonPassword }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: authContent.login.submitButtonMagicLink }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: authContent.login.magicLinkTab }));

    expect(
      screen.getByRole("button", { name: authContent.login.submitButtonMagicLink }),
    ).toBeInTheDocument();
  });

  /**
   * A magic link produces nothing on screen of its own: the next step is in a mailbox. Without
   * the confirmation the person is left looking at an unchanged form, and tries again.
   */
  it("says the magic link has been sent instead of appearing to do nothing", async () => {
    const signInWithOtp = vi
      .spyOn(supabase.auth, "signInWithOtp")
      .mockResolvedValue({ data: { user: null, session: null }, error: null });
    renderPage();

    await userEvent.click(screen.getByRole("tab", { name: authContent.login.magicLinkTab }));
    await userEvent.type(
      screen.getByRole("textbox", { name: authContent.login.emailLabel }),
      EMAIL,
    );
    await userEvent.click(
      screen.getByRole("button", { name: authContent.login.submitButtonMagicLink }),
    );

    expect(signInWithOtp).toHaveBeenCalled();
    expect(await screen.findByText(authContent.login.magicLinkSent)).toBeInTheDocument();
  });

  /**
   * A refused sign-in is the most common thing that happens on this screen, and Supabase phrases
   * it as "Invalid login credentials". Shown verbatim it is English, technical, and says nothing
   * about which of the two mistakes was made.
   */
  it.each([["invalid_credentials"], ["email_not_confirmed"]])(
    "translates a %s refusal instead of printing the technical message",
    async (code) => {
      const refusal = new AuthError("Invalid login credentials", 400, code);
      vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
        data: { user: null, session: null },
        error: refusal,
      });
      renderPage();

      await userEvent.type(
        screen.getByRole("textbox", { name: authContent.login.emailLabel }),
        EMAIL,
      );
      await userEvent.type(
        screen.getByLabelText(authContent.login.passwordLabel, { selector: "input" }),
        "Motdepasse123!",
      );
      await userEvent.click(
        screen.getByRole("button", { name: authContent.login.submitButtonPassword }),
      );

      expect(await screen.findByText(authErrorMessage(refusal))).toBeInTheDocument();
      expect(screen.queryByText(/Invalid login credentials/)).not.toBeInTheDocument();
    },
  );

  /**
   * An unconfirmed address is the one refusal the person can act on from here, so the screen
   * offers the resend rather than leaving them to guess that a mail is waiting to be re-sent.
   */
  it("offers to send the confirmation email again when that is what is missing", async () => {
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthError("Email not confirmed", 400, "email_not_confirmed"),
    });
    renderPage();

    await userEvent.type(
      screen.getByRole("textbox", { name: authContent.login.emailLabel }),
      EMAIL,
    );
    await userEvent.type(
      screen.getByLabelText(authContent.login.passwordLabel, { selector: "input" }),
      "Motdepasse123!",
    );
    await userEvent.click(
      screen.getByRole("button", { name: authContent.login.submitButtonPassword }),
    );

    expect(
      await screen.findByRole("button", { name: authContent.login.resendConfirmationLink }),
    ).toBeInTheDocument();
  });

  it("leads to account creation and to password recovery", () => {
    renderPage();

    expect(screen.getByRole("link", { name: authContent.login.signupLink })).toHaveAttribute(
      "href",
      "/inscription",
    );
    expect(
      screen.getByRole("link", { name: authContent.login.forgotPasswordLink }),
    ).toHaveAttribute("href", "/mot-de-passe-oublie");
  });
});
