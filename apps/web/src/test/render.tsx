import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { render, type RenderResult } from "@testing-library/react";
import { AuthContext, type AuthContextValue } from "@/auth/auth-context";

const silentQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

export interface RenderOptions {
  route?: string;
  path?: string;
  auth?: Partial<AuthContextValue>;
  /**
   * Routes rendered through the element's own `<Outlet />`. A route guard shows nothing of its
   * own, so without something under it "passes through" is not observable.
   */
  children?: RouteObject[];
  /**
   * Routes the element may send the visitor to. Without them every redirect lands on the same
   * catch-all, and a guard test cannot tell one destination from another.
   */
  siblings?: RouteObject[];
}

/** Renders a screen with the providers it expects, and a router it can navigate. */
export const renderWithProviders = (
  element: ReactElement,
  { route = "/", path = "/", auth = {}, children, siblings = [] }: RenderOptions = {},
): RenderResult => {
  const router = createMemoryRouter(
    [
      { path, element, ...(children === undefined ? {} : { children }) },
      ...siblings,
      { path: "*", element: <div data-testid="elsewhere" /> },
    ],
    { initialEntries: [route] },
  );

  const authValue: AuthContextValue = { session: null, user: null, loading: false, ...auth };

  const Wrapper = ({ children: subtree }: { children: ReactNode }) => (
    <QueryClientProvider client={silentQueryClient()}>
      <AuthContext.Provider value={authValue}>{subtree}</AuthContext.Provider>
    </QueryClientProvider>
  );

  return render(<RouterProvider router={router} />, { wrapper: Wrapper });
};
