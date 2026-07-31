import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";

const COOLDOWN_SECONDS = 60;

export const VerifyEmailPage = () => {
  const { session } = useAuth();
  const location = useLocation();
  const state: unknown = location.state;
  const email =
    state !== null &&
    typeof state === "object" &&
    "email" in state &&
    typeof state.email === "string"
      ? state.email
      : undefined;
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
        <CardHeader>
          <CardTitle>{authContent.verifyEmail.title}</CardTitle>
          <CardDescription>{authContent.verifyEmail.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <AlertIndicator />
            <AlertDescription>{authContent.verifyEmail.diagnosticKept}</AlertDescription>
          </Alert>

          {resend.isSuccess ? (
            <Alert variant="success">
              <AlertIndicator />
              <AlertDescription>{authContent.verifyEmail.emailResent}</AlertDescription>
            </Alert>
          ) : null}

          {resend.isError ? (
            <Alert variant="destructive">
              <AlertIndicator />
              <AlertDescription>{authErrorMessage(resend.error)}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            disabled={!email || secondsLeft > 0}
            pending={resend.isPending}
            onClick={resendEmail}
          >
            {secondsLeft > 0
              ? `${authContent.verifyEmail.cooldownPrefix} ${secondsLeft}${authContent.verifyEmail.seconds}`
              : authContent.verifyEmail.resendButton}
          </Button>
        </CardFooter>
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
