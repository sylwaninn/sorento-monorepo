import { useState } from "react";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Typography } from "@heroui/react";
import { InvitationRepository } from "@sorento/supabase-client";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/lib/supabase-client";
import { savePendingInvitationToken } from "@/features/dossier/pending-invitation";
import { userFacingErrorMessage } from "@/lib/error-messages";
import { dossierContent } from "@/features/dossier/content";
import { InlineLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{dossierContent.acceptInvitation.title}</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          {resolveQuery.isPending ? (
            <InlineLoader />
          ) : resolveQuery.isError || !resolveQuery.data ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{dossierContent.acceptInvitation.invalidTitle}</Alert.Title>
                <Alert.Description>
                  {dossierContent.acceptInvitation.invalidDescription}
                </Alert.Description>
              </Alert.Content>
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
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{acceptError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {session ? (
                <Button variant="primary" fullWidth isPending={accepting} onPress={accept}>
                  {dossierContent.acceptInvitation.acceptButton}
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Typography.Paragraph color="muted" size="sm">
                    {dossierContent.acceptInvitation.needAccount}
                  </Typography.Paragraph>
                  <Button variant="primary" fullWidth onPress={() => goToAuth("/inscription")}>
                    {dossierContent.acceptInvitation.signupButton}
                  </Button>
                  <Button variant="outline" fullWidth onPress={() => goToAuth("/connexion")}>
                    {dossierContent.acceptInvitation.loginButton}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Content>
        <Card.Footer>
          <RouterLink className="link text-sm" to="/">
            {sharedContent.backHome}
          </RouterLink>
        </Card.Footer>
      </Card>
    </div>
  );
};
