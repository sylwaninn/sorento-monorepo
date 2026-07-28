import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { RouteObject } from "react-router";

vi.mock("@sorento/supabase-client", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { stubDataLayer } = await import("@/test/supabase-stub");
  return stubDataLayer(actual);
});

import { routes } from "@/routes";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

/**
 * Renders every screen the route table declares.
 *
 * This is the cheapest test in the repo and it covers the failure that actually reached a
 * browser: `Rendered more hooks than during the previous render`, a crash no schema test and no
 * threshold can see, because it is not a wrong value — it is a screen that cannot mount. The
 * same pass catches a broken import, a missing provider and a route pointing at a component
 * that no longer exists.
 *
 * It walks the exported table rather than a list written here, so a new screen is covered the
 * moment its route is added and a deleted screen removes its own case. Guard elements have no
 * `path`, so they are skipped: they are tested where they belong, in their own suites, and
 * going through them here would only mean asserting on a redirect.
 */

interface Screen {
  path: string;
  element: ReactElement;
}

const collectScreens = (table: readonly RouteObject[]): Screen[] =>
  table.flatMap((route) => [
    ...(route.path !== undefined && route.element !== undefined
      ? [{ path: route.path, element: route.element as ReactElement }]
      : []),
    ...(route.children === undefined ? [] : collectScreens(route.children)),
  ]);

const SAMPLE_ID = "00000000-0000-4000-8000-000000000042";

/** `/dossiers/:dossierId` cannot be visited as written; the params get a plausible value. */
const visitable = (path: string): string => path.replace(/:[A-Za-z]+/g, SAMPLE_ID);

const screens = collectScreens(routes);

describe("route table", () => {
  it("declares screens to render", () => {
    expect(screens.length).toBeGreaterThan(20);
  });

  it("gives every screen a distinct path", () => {
    const paths = screens.map((route) => route.path);

    expect(new Set(paths).size).toBe(paths.length);
  });
});

/**
 * React and React Router do not rethrow a render failure: the nearest boundary catches it and
 * renders a fallback, so `render` returns normally and the page looks mounted. The only signal
 * left is what they write to console.error, which is why the smoke assertion reads it.
 */
const FATAL_RENDER =
  /The above error occurred|caught the following error|Rendered (more|fewer) hooks/;

describe.each(screens)("$path", ({ path, element }) => {
  it("mounts", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = renderWithProviders(element, {
      route: visitable(path),
      path,
      auth: { session: signedInSession(), user: signedInSession().user, loading: false },
    });

    const renderFailures = consoleError.mock.calls
      .map((call) => call.map(String).join(" "))
      .filter((message) => FATAL_RENDER.test(message));

    expect(renderFailures).toEqual([]);
    // The catch-all in renderWithProviders means the route did not match, so the screen under
    // test never mounted and the assertion below would pass on an empty page.
    expect(screen.queryByTestId("elsewhere")).toBeNull();
    expect(container).not.toBeEmptyDOMElement();
  });
});
