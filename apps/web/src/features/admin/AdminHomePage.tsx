import { linkVariants } from "@/components/ui/link";
import { Link as RouterLink } from "react-router";
import { adminContent } from "@/features/admin/content";
import { sharedContent } from "@/components/content";
import { Card, CardContent } from "@/components/ui/card";
import { Heading } from "@/components/ui/typography";

export const AdminHomePage = () => (
  <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
    <div className="flex items-center justify-between">
      <Heading level={1}>{adminContent.home.title}</Heading>
      <RouterLink className={linkVariants()} to="/mes-dossiers">
        {sharedContent.back}
      </RouterLink>
    </div>

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
  </div>
);
