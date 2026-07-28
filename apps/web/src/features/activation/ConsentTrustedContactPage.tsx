import { useState } from "react";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router";
import { Alert, Button, Card, Typography } from "@heroui/react";
import { TrustedContactRepository } from "@sorento/supabase-client";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/lib/supabase-client";
import { savePendingConsentToken } from "@/features/activation/pending-consent";
import { activationContent } from "@/features/activation/content";
import { sharedContent } from "@/components/content";

export const ConsentTrustedContactPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goToAuth = (path: "/inscription" | "/connexion") => {
    savePendingConsentToken(token);
    navigate(path);
  };

  const confirm = async () => {
    setIsConfirming(true);
    setError(null);
    try {
      const result = await new TrustedContactRepository(supabase).consent(token);
      setDossierId(result.dossierId);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : activationContent.consent.invalidDescription,
      );
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{activationContent.consent.title}</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          {!token ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{activationContent.consent.invalidTitle}</Alert.Title>
                <Alert.Description>
                  {activationContent.consent.invalidDescription}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : dossierId ? (
            <>
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{activationContent.consent.confirmed}</Alert.Description>
                </Alert.Content>
              </Alert>
              <Button
                variant="primary"
                fullWidth
                onPress={() => navigate(`/dossiers/${dossierId}`)}
              >
                {activationContent.consent.goToDossier}
              </Button>
            </>
          ) : (
            <>
              {error ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {session ? (
                <Button variant="primary" fullWidth isPending={isConfirming} onPress={confirm}>
                  {activationContent.consent.confirmButton}
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Typography.Paragraph color="muted" size="sm">
                    {activationContent.consent.needAccount}
                  </Typography.Paragraph>
                  <Button variant="primary" fullWidth onPress={() => goToAuth("/inscription")}>
                    {activationContent.consent.signupButton}
                  </Button>
                  <Button variant="outline" fullWidth onPress={() => goToAuth("/connexion")}>
                    {activationContent.consent.loginButton}
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
