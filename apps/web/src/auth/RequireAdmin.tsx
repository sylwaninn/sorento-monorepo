import { Navigate, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { repositories } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/auth/useAuth";
import { PageLoader } from "@/components/PageLoader";

export const RequireAdmin = () => {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: queryKeys.account.isAdmin(user?.id ?? ""),
    queryFn: () => repositories.profiles.listByIds([user?.id ?? ""]),
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
