import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/auth/AuthProvider";
import { BrowserChromeTint } from "@/components/BrowserChromeTint";
import { router } from "@/routes";

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserChromeTint />
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryClientProvider>
);
