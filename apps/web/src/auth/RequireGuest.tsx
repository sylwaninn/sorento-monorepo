import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { InvitationRepository, TrustedContactRepository } from "@sorento/supabase-client";
import { supabase } from "@/lib/supabase-client";
import {
  clearPendingInvitationToken,
  getPendingInvitationToken,
} from "@/features/dossier/pending-invitation";
import {
  clearPendingConsentToken,
  getPendingConsentToken,
} from "@/features/activation/pending-consent";
import { useAuth } from "@/auth/useAuth";
import { PageLoader } from "@/components/PageLoader";

// Prevents an already-logged-in user from seeing the login/signup screens again.
export const RequireGuest = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (session) {
    return <AuthenticatedRedirect />;
  }

  return <Outlet />;
};

const AuthenticatedRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const pendingInvitationToken = getPendingInvitationToken();
    if (pendingInvitationToken) {
      new InvitationRepository(supabase)
        .accept(pendingInvitationToken)
        .then(({ dossierId }) => {
          clearPendingInvitationToken();
          navigate(`/dossiers/${dossierId}`, { replace: true });
        })
        .catch(() =>
          navigate(`/invitations/accepter?token=${pendingInvitationToken}`, { replace: true }),
        );
      return;
    }

    const pendingConsentToken = getPendingConsentToken();
    if (pendingConsentToken) {
      new TrustedContactRepository(supabase)
        .consent(pendingConsentToken)
        .then(({ dossierId }) => {
          clearPendingConsentToken();
          navigate(`/dossiers/${dossierId}`, { replace: true });
        })
        .catch(() =>
          navigate(`/contact-confiance/confirmer?token=${pendingConsentToken}`, {
            replace: true,
          }),
        );
      return;
    }

    navigate("/mes-dossiers", { replace: true });
  }, [navigate]);

  return <PageLoader />;
};
