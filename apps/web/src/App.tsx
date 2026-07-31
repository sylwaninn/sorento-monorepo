import { RouterProvider } from "react-router";
import { BrowserChromeTint } from "@/components/BrowserChromeTint";
import { router } from "@/routes";

/**
 * No providers here on purpose: AuthBoundary in routes.tsx owns them, behind a lazy route, so
 * the public homepage neither downloads the Supabase client nor opens an auth subscription.
 * Wrapping the router here as well would mount a second copy of both.
 */
export const App = () => (
  <>
    <BrowserChromeTint />
    <RouterProvider router={router} />
  </>
);
