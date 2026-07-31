import { CenteredShell } from "@/layout/CenteredShell";
import { linkVariants } from "@/components/ui/link";
import { useState } from "react";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { InvitationRepository } from "@sorento/supabase-client";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/lib/supabase-client";
import { savePendingInvitationToken } from "@/features/dossier/pending-invitation";
import { userFacingErrorMessage } from "@/lib/error-messages";
import { dossierContent } from "@/features/dossier/content";
import { InlineLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator, AlertTitle } from "@/components/ui/alert";
import { Text } from "@/components/ui/typography";

export const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { session } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const resolveQuery = useQuery({
    queryKey: ["resolve-invitation", token],
    queryFn: () => new InvitationRepository(supabase).resolve(token),
    enabled: token.length > 0,
    retry: false,
  });

  const goToAuth = (path: "/inscription" | "/connexion") => {
    savePendingInvitationToken(token);
    navigate(path);
  };

  const accept = async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      const { dossierId } = await new InvitationRepository(supabase).accept(token);
      navigate(`/dossiers/${dossierId}`);
    } catch (error) {
      setAcceptError(userFacingErrorMessage(error));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <CenteredShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{dossierContent.acceptInvitation.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {resolveQuery.isPending ? (
            <InlineLoader />
          ) : resolveQuery.isError || !resolveQuery.data ? (
            <Alert variant="destructive">
              <AlertIndicator />
              <AlertTitle>{dossierContent.acceptInvitation.invalidTitle}</AlertTitle>
              <AlertDescription>
                {dossierContent.acceptInvitation.invalidDescription}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p>
                <strong>{resolveQuery.data.invitedByFirstName}</strong>{" "}
                {dossierContent.acceptInvitation.descriptionPrefix}{" "}
                {resolveQuery.data.subjectFirstName} {resolveQuery.data.subjectLastName},{" "}
                {dossierContent.acceptInvitation.asRole}{" "}
                {dossierContent.members.roleLabels[resolveQuery.data.role]}.
              </p>

              {acceptError ? (
                <Alert variant="destructive">
                  <AlertIndicator />
                  <AlertDescription>{acceptError}</AlertDescription>
                </Alert>
              ) : null}

              {session ? (
                <Button variant="default" className="w-full" pending={accepting} onClick={accept}>
                  {dossierContent.acceptInvitation.acceptButton}
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Text tone="muted" size="sm">
                    {dossierContent.acceptInvitation.needAccount}
                  </Text>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => goToAuth("/inscription")}
                  >
                    {dossierContent.acceptInvitation.signupButton}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => goToAuth("/connexion")}
                  >
                    {dossierContent.acceptInvitation.loginButton}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter>
          <RouterLink className={linkVariants()} to="/">
            {sharedContent.backHome}
          </RouterLink>
        </CardFooter>
      </Card>
    </CenteredShell>
  );
};
