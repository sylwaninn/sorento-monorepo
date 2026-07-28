import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Alert, Button, Card } from "@heroui/react";
import { InvitationRepository, TrustedContactRepository } from "@sorento/supabase-client";
import { useAuth } from "@/auth/useAuth";
import { useResendConfirmationMutation } from "@/auth/use-auth-mutations";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { supabase } from "@/lib/supabase-client";
import { attachDiagnosticFromSession } from "@/features/diagnostic/attach-diagnostic";
import {
  clearPendingInvitationToken,
  getPendingInvitationToken,
} from "@/features/dossier/pending-invitation";
import {
  clearPendingConsentToken,
  getPendingConsentToken,
} from "@/features/activation/pending-consent";
import { authContent } from "@/features/auth/content";
import { PageLoader } from "@/components/PageLoader";

const COOLDOWN_SECONDS = 60;

export const VerifyEmailPage = () => {
  const { session } = useAuth();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;
  const resend = useResendConfirmationMutation();
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // The confirmation link establishes the session directly in this tab: attach any pending
  // diagnostic (E02 -> account attachment) then move on.
  if (session) {
    return <ConfirmedRedirect />;
  }

  const resendEmail = () => {
    if (!email) return;
    resend.mutate(email, { onSuccess: () => setSecondsLeft(COOLDOWN_SECONDS) });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{authContent.verifyEmail.title}</Card.Title>
          <Card.Description>{authContent.verifyEmail.description}</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <Alert status="default">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{authContent.verifyEmail.diagnosticKept}</Alert.Description>
            </Alert.Content>
          </Alert>

          {resend.isSuccess ? (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{authContent.verifyEmail.emailResent}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {resend.isError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{authErrorMessage(resend.error)}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
        </Card.Content>
        <Card.Footer>
          <Button
            variant="outline"
            fullWidth
            isDisabled={!email || secondsLeft > 0}
            isPending={resend.isPending}
            onPress={resendEmail}
          >
            {secondsLeft > 0
              ? `${authContent.verifyEmail.cooldownPrefix} ${secondsLeft}${authContent.verifyEmail.seconds}`
              : authContent.verifyEmail.resendButton}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
};

const ConfirmedRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const pendingInvitationToken = getPendingInvitationToken();
      if (pendingInvitationToken) {
        try {
          const { dossierId } = await new InvitationRepository(supabase).accept(
            pendingInvitationToken,
          );
          clearPendingInvitationToken();
          navigate(`/dossiers/${dossierId}`, { replace: true });
          return;
        } catch {
          navigate(`/invitations/accepter?token=${pendingInvitationToken}`, { replace: true });
          return;
        }
      }

      const pendingConsentToken = getPendingConsentToken();
      if (pendingConsentToken) {
        try {
          const { dossierId } = await new TrustedContactRepository(supabase).consent(
            pendingConsentToken,
          );
          clearPendingConsentToken();
          navigate(`/dossiers/${dossierId}`, { replace: true });
          return;
        } catch {
          navigate(`/contact-confiance/confirmer?token=${pendingConsentToken}`, { replace: true });
          return;
        }
      }

      await attachDiagnosticFromSession();
      navigate("/mes-dossiers", { replace: true });
    };
    run();
  }, [navigate]);

  return <PageLoader />;
};
