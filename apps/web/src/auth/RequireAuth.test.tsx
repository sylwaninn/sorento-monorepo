import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { Session } from "@sorento/supabase-client";

vi.mock("@sorento/supabase-client", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { stubDataLayer } = await import("@/test/supabase-stub");
  return stubDataLayer(actual);
});

import { RequireAuth } from "@/auth/RequireAuth";
import { LoginPage } from "@/features/auth/LoginPage";
import { authContent } from "@/features/auth/content";
import { notificationsContent } from "@/features/notifications/content";
import { sharedContent } from "@/components/content";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

/**
 * RequireAuth is the whole of the app's client-side access control for signed-in areas, and it
 * had no test of its own. What matters is not that it calls `Navigate`, it is where a person
 * ends up: a stranger on the login screen, a member on the page they asked for, and nobody
 * moved at all while the session is still being read back.
 */

/**
 * Stands in for whatever the guard protects. A real screen would drag its data layer into a
 * test about access control, and the guard treats them all alike anyway.
 */
const ProtectedScreen = () => <h1>Protected screen</h1>;

const PROTECTED_HEADING = "Protected screen";

const renderGuard = ({ session, loading }: { session: Session | null; loading: boolean }) =>
  renderWithProviders(<RequireAuth />, {
    route: "/dossiers",
    path: "/dossiers",
    auth: { session, user: session === null ? null : session.user, loading },
    children: [{ index: true, element: <ProtectedScreen /> }],
    siblings: [{ path: "/connexion", element: <LoginPage /> }],
  });

describe("RequireAuth", () => {
  it("sends a signed-out visitor to the login screen", () => {
    renderGuard({ session: null, loading: false });

    expect(screen.getByRole("heading", { name: authContent.login.title })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: PROTECTED_HEADING })).not.toBeInTheDocument();
  });

  it("lets a signed-in visitor reach the page, with the app navigation around it", () => {
    renderGuard({ session: signedInSession(), loading: false });

    expect(screen.getByRole("heading", { name: PROTECTED_HEADING })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: notificationsContent.bell.label }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: authContent.login.title }),
    ).not.toBeInTheDocument();
  });

  /**
   * The user-visible bug this exists for: on a page refresh the session is read back
   * asynchronously, so for a moment there is no session and no error either. A guard that
   * treats "not yet known" as "not signed in" logs the person out every time they hit F5.
   */
  it("neither redirects nor reveals the page while the session is still being resolved", () => {
    renderGuard({ session: null, loading: true });

    expect(
      screen.queryByRole("heading", { name: authContent.login.title }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: PROTECTED_HEADING })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(sharedContent.loading);
  });
});
