import { CenteredShell } from "@/layout/CenteredShell";
import { linkVariants } from "@/components/ui/link";
import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router";
import { DossierRepository } from "@sorento/supabase-client";
import { useAuth } from "@/auth/useAuth";
import { useLogoutMutation } from "@/auth/use-auth-mutations";
import { supabase } from "@/lib/supabase-client";
import { InlineLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";

export const DossiersPage = () => {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const dossiersQuery = useQuery({
    queryKey: ["dossiers", user?.id],
    queryFn: () => new DossierRepository(supabase).listForCurrentUser(),
  });

  return (
    <CenteredShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mes dossiers</CardTitle>
          <CardDescription>Connecté en tant que {user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {dossiersQuery.isPending ? (
            <InlineLoader />
          ) : dossiersQuery.data && dossiersQuery.data.length > 0 ? (
            dossiersQuery.data.map((dossier) => (
              <RouterLink key={dossier.id} to={`/dossiers/${dossier.id}`}>
                <div className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-md border p-3 transition-colors">
                  <span>
                    {dossier.subjectFirstName} {dossier.subjectLastName}
                  </span>
                  <Badge variant={dossier.status === "ACTIVE" ? "accent" : "default"}>
                    {dossier.status === "ACTIVE" ? "Actif" : "Préparation"}
                  </Badge>
                </div>
              </RouterLink>
            ))
          ) : (
            <Text tone="muted" size="sm">
              Aucun dossier pour l'instant.
            </Text>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <RouterLink className={linkVariants()} to="/diagnostic">
            Créer un dossier
          </RouterLink>
          <RouterLink className={linkVariants()} to="/parametres">
            Paramètres du compte
          </RouterLink>
          <Button
            variant="outline"
            className="w-full"
            pending={logout.isPending}
            onClick={() => logout.mutate()}
          >
            Se déconnecter
          </Button>
        </CardFooter>
      </Card>
    </CenteredShell>
  );
};
