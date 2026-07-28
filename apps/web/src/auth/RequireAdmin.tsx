import { Navigate, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ProfileRepository } from "@sorento/supabase-client";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/auth/useAuth";
import { PageLoader } from "@/components/PageLoader";

export const RequireAdmin = () => {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => new ProfileRepository(supabase).listByIds([user?.id ?? ""]),
    enabled: Boolean(user),
  });

  if (profileQuery.isPending) {
    return <PageLoader />;
  }

  const isAdmin = profileQuery.data?.[0]?.role === "admin";
  if (!isAdmin) {
    return <Navigate to="/mes-dossiers" replace />;
  }

  return <Outlet />;
};
