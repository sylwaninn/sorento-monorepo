import { Navigate, Outlet, useLocation } from "react-router";
import { AppHeader } from "@/layout/AppHeader";
import { useAuth } from "@/auth/useAuth";
import { PageLoader } from "@/components/PageLoader";

export const RequireAuth = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!session) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
};
