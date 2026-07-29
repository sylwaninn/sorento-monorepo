import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router";
import { Button, Card, Chip, Typography } from "@heroui/react";
import { DossierRepository } from "@sorento/supabase-client";
import { useAuth } from "@/auth/useAuth";
import { useLogoutMutation } from "@/auth/use-auth-mutations";
import { supabase } from "@/lib/supabase-client";
import { InlineLoader } from "@/components/PageLoader";

export const DossiersPage = () => {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const dossiersQuery = useQuery({
    queryKey: ["dossiers", user?.id],
    queryFn: () => new DossierRepository(supabase).listForCurrentUser(),
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Mes dossiers</Card.Title>
          <Card.Description>Connecté en tant que {user?.email}</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {dossiersQuery.isPending ? (
            <InlineLoader />
          ) : dossiersQuery.data && dossiersQuery.data.length > 0 ? (
            dossiersQuery.data.map((dossier) => (
              <RouterLink key={dossier.id} to={`/dossiers/${dossier.id}`}>
                <div className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-md border p-3 transition-colors">
                  <span>
                    {dossier.subjectFirstName} {dossier.subjectLastName}
                  </span>
                  <Chip color={dossier.status === "ACTIVE" ? "accent" : "default"}>
                    {dossier.status === "ACTIVE" ? "Actif" : "Préparation"}
                  </Chip>
                </div>
              </RouterLink>
            ))
          ) : (
            <Typography.Paragraph color="muted" size="sm">
              Aucun dossier pour l'instant.
            </Typography.Paragraph>
          )}
        </Card.Content>
        <Card.Footer className="flex flex-col gap-3">
          <RouterLink className="link text-sm" to="/diagnostic">
            Créer un dossier
          </RouterLink>
          <RouterLink className="link text-sm" to="/parametres">
            Paramètres du compte
          </RouterLink>
          <Button
            variant="outline"
            fullWidth
            isPending={logout.isPending}
            onPress={() => logout.mutate()}
          >
            Se déconnecter
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
};
