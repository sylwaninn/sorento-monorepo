import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { clearAnswersFromSession } from "@/features/diagnostic/diagnostic-session";
import { clearPendingConsentToken } from "@/features/activation/pending-consent";
import { clearPendingInvitationToken } from "@/features/dossier/pending-invitation";

const REDIRECT_VERIFY_EMAIL = `${window.location.origin}/verification-email`;
const REDIRECT_AFTER_LOGIN = `${window.location.origin}/mes-dossiers`;
const REDIRECT_RESET_PASSWORD = `${window.location.origin}/auth/reset`;

export const useSignupMutation = () =>
  useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: { emailRedirectTo: REDIRECT_VERIFY_EMAIL },
      });
      if (error) throw error;
    },
  });

/**
 * Development-only: creates an already-confirmed account through the dev-signup Edge Function,
 * then signs in. The real gate is server-side (the function refuses on any environment that
 * is not a local stack), so this stays a convenience, never a security boundary.
 */
export const useDevSignupMutation = () =>
  useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { error } = await supabase.functions.invoke("dev-signup", { body: input });
      if (error) throw error;

      const { error: loginError } = await supabase.auth.signInWithPassword(input);
      if (loginError) throw loginError;
    },
  });

export const useResendConfirmationMutation = () =>
  useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: REDIRECT_VERIFY_EMAIL },
      });
      if (error) throw error;
    },
  });

export const usePasswordLoginMutation = () =>
  useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword(input);
      if (error) throw error;
    },
  });

export const useMagicLinkLoginMutation = () =>
  useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: REDIRECT_AFTER_LOGIN },
      });
      if (error) throw error;
    },
  });

export const usePasswordResetRequestMutation = () =>
  useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: REDIRECT_RESET_PASSWORD,
      });
      if (error) throw error;
    },
  });

export const usePasswordResetConfirmMutation = () =>
  useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      // Password just changed: invalidate every other active session.
      await supabase.auth.signOut({ scope: "others" });
    },
  });

export const useEmailChangeMutation = () =>
  useMutation({
    mutationFn: async (newEmail: string) => {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
    },
  });

export const usePasswordChangeMutation = () =>
  useMutation({
    mutationFn: async (input: {
      currentEmail: string;
      currentPassword: string;
      newPassword: string;
    }) => {
      const { error: verificationError } = await supabase.auth.signInWithPassword({
        email: input.currentEmail,
        password: input.currentPassword,
      });
      if (verificationError) throw verificationError;

      const { error } = await supabase.auth.updateUser({ password: input.newPassword });
      if (error) throw error;

      await supabase.auth.signOut({ scope: "others" });
    },
  });

export const useLogoutMutation = () =>
  useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // On a shared computer, leftover anonymous answers or pending tokens must not
      // survive into the next person's session.
      clearAnswersFromSession();
      clearPendingInvitationToken();
      clearPendingConsentToken();
    },
  });
