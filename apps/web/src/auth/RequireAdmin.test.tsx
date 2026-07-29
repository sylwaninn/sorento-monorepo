import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type * as supabaseClient from "@sorento/supabase-client";
import type { ProfileRepository } from "@sorento/supabase-client";

/**
 * The repositories expose their methods as arrow class fields, so an instance carries its own
 * copy and `vi.spyOn(Prototype, ...)` never reaches it. RequireAdmin builds its repository
 * inline, which leaves no instance to spy on either: the class itself has to be replaced, and
 * a subclass is what keeps the replacement type-checked against the real signature.
 */
const { listProfilesByIds } = vi.hoisted(() => ({
  listProfilesByIds: vi.fn<ProfileRepository["listByIds"]>(),
}));

vi.mock("@sorento/supabase-client", async (importOriginal) => {
  const actual = await importOriginal<typeof supabaseClient>();
  return {
    ...actual,
    ProfileRepository: class extends actual.ProfileRepository {
      override listByIds = listProfilesByIds;
    },
  };
});

import { RequireAdmin } from "@/auth/RequireAdmin";
import { sharedContent } from "@/components/content";
import { aProfile } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

/**
 * The admin area is the one place in the app a user must not reach by typing a URL, and the
 * platform admin is explicitly not allowed into anyone's dossier in return. Nothing asserted
 * the difference until this file.
 */

const AdminScreen = () => <h1>Admin screen</h1>;
const DossiersScreen = () => <h1>Dossiers screen</h1>;

const ADMIN_HEADING = "Admin screen";
const DOSSIERS_HEADING = "Dossiers screen";

const renderGuard = () =>
  renderWithProviders(<RequireAdmin />, {
    route: "/admin",
    path: "/admin",
    auth: { session: signedInSession(), user: signedInSession().user },
    children: [{ index: true, element: <AdminScreen /> }],
    siblings: [{ path: "/mes-dossiers", element: <DossiersScreen /> }],
  });

describe("RequireAdmin", () => {
  it("lets a platform admin into the admin area", async () => {
    listProfilesByIds.mockResolvedValue([aProfile({ role: "admin" })]);

    renderGuard();

    expect(await screen.findByRole("heading", { name: ADMIN_HEADING })).toBeInTheDocument();
  });

  it("turns an ordinary signed-in user back to their own dossiers", async () => {
    listProfilesByIds.mockResolvedValue([aProfile({ role: "user" })]);

    renderGuard();

    expect(await screen.findByRole("heading", { name: DOSSIERS_HEADING })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: ADMIN_HEADING })).not.toBeInTheDocument();
  });

  /**
   * A profile row that comes back empty is the shape a tightened RLS policy produces, and it
   * must read as "not an admin" rather than as "no answer, carry on".
   */
  it("refuses the admin area when no profile comes back at all", async () => {
    listProfilesByIds.mockResolvedValue([]);

    renderGuard();

    expect(await screen.findByRole("heading", { name: DOSSIERS_HEADING })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: ADMIN_HEADING })).not.toBeInTheDocument();
  });

  /**
   * The role is not known yet, which is neither "admin" nor "not admin". Showing the admin
   * area would leak it for a frame; redirecting would bounce a real admin off their own page
   * on every refresh.
   */
  it("shows neither the admin area nor a redirect while the role is still unknown", () => {
    listProfilesByIds.mockReturnValue(new Promise(() => {}));

    renderGuard();

    expect(screen.queryByRole("heading", { name: ADMIN_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: DOSSIERS_HEADING })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(sharedContent.loading);
  });
});
