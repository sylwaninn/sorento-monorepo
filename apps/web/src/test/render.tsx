import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
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
}

/** Renders a screen with the providers it expects, and a router it can navigate. */
export const renderWithProviders = (
  element: ReactElement,
  { route = "/", path = "/", auth = {} }: RenderOptions = {},
): RenderResult => {
  const router = createMemoryRouter(
    [
      { path, element },
      { path: "*", element: <div data-testid="elsewhere" /> },
    ],
    { initialEntries: [route] },
  );

  const authValue: AuthContextValue = { session: null, user: null, loading: false, ...auth };

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={silentQueryClient()}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );

  return render(<RouterProvider router={router} />, { wrapper: Wrapper });
};
