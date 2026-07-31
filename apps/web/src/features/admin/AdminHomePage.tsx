import { Link as RouterLink } from "react-router";
import { adminContent } from "@/features/admin/content";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/layout/PageShell";

export const AdminHomePage = () => (
  <PageShell backTo="/mes-dossiers" title={adminContent.home.title}>
    <div className="flex flex-col gap-3">
      <RouterLink to="/admin/referentiel">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardContent className="py-4">{adminContent.home.links.catalog}</CardContent>
        </Card>
      </RouterLink>
      <RouterLink to="/admin/historique">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardContent className="py-4">{adminContent.home.links.history}</CardContent>
        </Card>
      </RouterLink>
      <RouterLink to="/admin/test-profil">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardContent className="py-4">{adminContent.home.links.testing}</CardContent>
        </Card>
      </RouterLink>
      <RouterLink to="/admin/statistiques">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardContent className="py-4">{adminContent.home.links.metrics}</CardContent>
        </Card>
      </RouterLink>
      <RouterLink to="/admin/design-system">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardContent className="py-4">{adminContent.home.links.designSystem}</CardContent>
        </Card>
      </RouterLink>
    </div>
  </PageShell>
);
