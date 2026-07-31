import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordResetConfirmPage } from "@/features/auth/PasswordResetConfirmPage";
import { authContent } from "@/features/auth/content";
import { supabase } from "@/lib/supabase-client";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

const c = authContent.passwordResetConfirm;
// Spelled out in words: a high-entropy literal here reads as a leaked credential to the secret scan.
const NEW_PASSWORD = "mot de passe tout neuf 2026";

/**
 * The screen a recovery link lands on. It is the only place in the product where someone arrives
 * holding a session they did not sign in for, so what it must never do is offer a password field
 * to a visitor whose link has expired: they would type a new password into nothing and believe
 * their account changed.
 */
const stubRecoverySession = (session: ReturnType<typeof signedInSession> | null) => {
  vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
    data: { session },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
    data: { subscription: { id: "1", callback: () => {}, unsubscribe: () => {} } },
  } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>);
};

const renderPage = () =>
  renderWithProviders(<PasswordResetConfirmPage />, { route: "/auth/reset", path: "/auth/reset" });

describe("PasswordResetConfirmPage", () => {
  it("explains an expired link instead of offering a form that leads nowhere", async () => {
    stubRecoverySession(null);
    renderPage();

    expect(await screen.findByText(c.invalidLinkTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: c.requestNewLink })).toBeInTheDocument();
    expect(screen.queryByLabelText(c.passwordLabel)).toBeNull();
  });

  it("refuses two passwords that do not match, without calling anything", async () => {
    const person = userEvent.setup();
    stubRecoverySession(signedInSession());
    const update = vi.spyOn(supabase.auth, "updateUser");
    renderPage();

    await person.type(await screen.findByLabelText(c.passwordLabel), NEW_PASSWORD);
    await person.type(screen.getByLabelText(c.confirmLabel), "autre chose");
    await person.click(screen.getByRole("button", { name: c.submitButton }));

    expect(update).not.toHaveBeenCalled();
  });

  /** Changing a password is also the moment to close whatever else is holding the old one. */
  it("saves the new password and signs the other sessions out", async () => {
    const person = userEvent.setup();
    stubRecoverySession(signedInSession());
    const update = vi.spyOn(supabase.auth, "updateUser").mockResolvedValue({
      data: { user: signedInSession().user },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.updateUser>>);
    const signOut = vi
      .spyOn(supabase.auth, "signOut")
      .mockResolvedValue({ error: null } as unknown as Awaited<
        ReturnType<typeof supabase.auth.signOut>
      >);
    renderPage();

    await person.type(await screen.findByLabelText(c.passwordLabel), NEW_PASSWORD);
    await person.type(screen.getByLabelText(c.confirmLabel), NEW_PASSWORD);
    await person.click(screen.getByRole("button", { name: c.submitButton }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ password: NEW_PASSWORD }));
    expect(signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(await screen.findByText(c.success)).toBeInTheDocument();
  });
});
