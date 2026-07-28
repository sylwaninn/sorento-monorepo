import { useParams } from "react-router";
import { useDossier } from "@/hooks/use-dossier";
import { DossierDashboardPage } from "@/features/dossier/DossierDashboardPage";
import { PreparationDashboardPage } from "@/features/dossier/PreparationDashboardPage";
import { PageLoader } from "@/components/PageLoader";

export const DossierHomePage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);

  if (access.isLoading) {
    return <PageLoader />;
  }

  return access.dossier?.status === "PREPARATION" ? (
    <PreparationDashboardPage />
  ) : (
    <DossierDashboardPage />
  );
};
