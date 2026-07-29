import { useParams } from "react-router";
import { useDossier } from "@/hooks/use-dossier";
import { DossierDashboardPage } from "@/features/dossier/DossierDashboardPage";
import { PreparationDashboardPage } from "@/features/dossier/PreparationDashboardPage";
import { PageLoader } from "@/components/PageLoader";
import { ErrorAlert } from "@/components/ErrorAlert";

export const DossierHomePage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);

  if (access.isLoading) {
    return <PageLoader />;
  }
  if (!access.dossier) {
    return (
      <div className="mx-auto max-w-2xl p-4 py-8">
        <ErrorAlert message="Ce dossier est introuvable ou vous n’y avez pas accès." />
      </div>
    );
  }

  return access.dossier.status === "PREPARATION" ? (
    <PreparationDashboardPage />
  ) : (
    <DossierDashboardPage />
  );
};
