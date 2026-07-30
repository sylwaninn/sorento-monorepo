import { linkVariants } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router";
import { TrustedContactRepository } from "@sorento/supabase-client";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/lib/supabase-client";
import { savePendingConsentToken } from "@/features/activation/pending-consent";
import { isExpiredLinkError, userFacingErrorMessage } from "@/lib/error-messages";
import { activationContent } from "@/features/activation/content";
import { sharedContent } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator, AlertTitle } from "@/components/ui/alert";
import { Text } from "@/components/ui/typography";

export const ConsentTrustedContactPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
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
      setActivationUrl(result.activationUrl);
    } catch (confirmError) {
      // A spent link has copy written for it here, naming what to ask the owner for next, which
      // is more use than the generic sentence. Anything else goes through the shared translator:
      // the raw message used to reach the screen, in English, on a page about someone's death.
      setError(
        isExpiredLinkError(confirmError)
          ? activationContent.consent.invalidDescription
          : userFacingErrorMessage(confirmError),
      );
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{activationContent.consent.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!token ? (
            <Alert variant="destructive">
              <AlertIndicator />
              <AlertTitle>{activationContent.consent.invalidTitle}</AlertTitle>
              <AlertDescription>{activationContent.consent.invalidDescription}</AlertDescription>
            </Alert>
          ) : dossierId ? (
            <>
              <Alert variant="success">
                <AlertIndicator />
                <AlertDescription>{activationContent.consent.confirmed}</AlertDescription>
              </Alert>
              {activationUrl ? (
                <a className={cn(linkVariants(), "break-all")} href={activationUrl}>
                  Conserver mon lien d’activation
                </a>
              ) : null}
              <Button
                variant="default"
                className="w-full"
                onClick={() => navigate(`/dossiers/${dossierId}`)}
              >
                {activationContent.consent.goToDossier}
              </Button>
            </>
          ) : (
            <>
              {error ? (
                <Alert variant="destructive">
                  <AlertIndicator />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {session ? (
                <Button
                  variant="default"
                  className="w-full"
                  pending={isConfirming}
                  onClick={confirm}
                >
                  {activationContent.consent.confirmButton}
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Text tone="muted" size="sm">
                    {activationContent.consent.needAccount}
                  </Text>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => goToAuth("/inscription")}
                  >
                    {activationContent.consent.signupButton}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => goToAuth("/connexion")}
                  >
                    {activationContent.consent.loginButton}
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
    </div>
  );
};
