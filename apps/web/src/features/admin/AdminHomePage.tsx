import { Link as RouterLink } from "react-router";
import { Card, Typography } from "@heroui/react";
import { adminContent } from "@/features/admin/content";
import { sharedContent } from "@/components/content";

export const AdminHomePage = () => (
  <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
    <div className="flex items-center justify-between">
      <Typography.Heading level={1}>{adminContent.home.title}</Typography.Heading>
      <RouterLink className="link text-sm" to="/mes-dossiers">
        {sharedContent.back}
      </RouterLink>
    </div>

    <div className="flex flex-col gap-3">
      <RouterLink to="/admin/referentiel">
        <Card className="hover:bg-muted/50 transition-colors">
          <Card.Content className="py-4">{adminContent.home.links.catalog}</Card.Content>
        </Card>
      </RouterLink>
      <RouterLink to="/admin/historique">
        <Card className="hover:bg-muted/50 transition-colors">
          <Card.Content className="py-4">{adminContent.home.links.history}</Card.Content>
        </Card>
      </RouterLink>
      <RouterLink to="/admin/test-profil">
        <Card className="hover:bg-muted/50 transition-colors">
          <Card.Content className="py-4">{adminContent.home.links.testing}</Card.Content>
        </Card>
      </RouterLink>
      <RouterLink to="/admin/statistiques">
        <Card className="hover:bg-muted/50 transition-colors">
          <Card.Content className="py-4">{adminContent.home.links.metrics}</Card.Content>
        </Card>
      </RouterLink>
    </div>
  </div>
);
