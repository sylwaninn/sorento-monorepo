import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@sorento/supabase-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "react-router";
import { supabase } from "@/lib/supabase-client";
import { AuthContext, type AuthContextValue } from "@/auth/auth-context";
import { queryClient } from "@/lib/query-client";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = { session, user: session?.user ?? null, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Loads application-only providers after a visitor leaves the public homepage. */
export const AuthBoundary = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  </QueryClientProvider>
);
