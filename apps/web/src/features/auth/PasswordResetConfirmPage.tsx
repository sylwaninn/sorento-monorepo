import { CenteredShell } from "@/layout/CenteredShell";
import { linkVariants } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import { passwordResetConfirmSchema } from "@sorento/domain";
import { supabase } from "@/lib/supabase-client";
import { fieldErrors } from "@/lib/zod-form-errors";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { usePasswordResetConfirmMutation } from "@/auth/use-auth-mutations";
import { authContent } from "@/features/auth/content";
import { InlineLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

type LinkState = "loading" | "valid" | "invalid";

export const PasswordResetConfirmPage = () => {
  const [linkState, setLinkState] = useState<LinkState>("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLinkState(data.session ? "valid" : "invalid");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setLinkState("valid");
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <CenteredShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{authContent.passwordResetConfirm.title}</CardTitle>
        </CardHeader>
        {linkState === "loading" ? (
          <InlineLoader />
        ) : linkState === "invalid" ? (
          <CardContent className="flex flex-col gap-4">
            <Alert variant="destructive">
              <AlertIndicator />
              <AlertTitle>{authContent.passwordResetConfirm.invalidLinkTitle}</AlertTitle>
              <AlertDescription>
                {authContent.passwordResetConfirm.invalidLinkDescription}
              </AlertDescription>
            </Alert>
            <RouterLink className={cn(linkVariants(), "text-center")} to="/mot-de-passe-oublie">
              {authContent.passwordResetConfirm.requestNewLink}
            </RouterLink>
          </CardContent>
        ) : (
          <NewPasswordForm />
        )}
      </Card>
    </CenteredShell>
  );
};

const NewPasswordForm = () => {
  const confirm = usePasswordResetConfirmMutation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = passwordResetConfirmSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    confirm.mutate(result.data.password);
  };

  if (confirm.isSuccess) {
    return (
      <CardContent className="flex flex-col gap-4">
        <Alert variant="success">
          <AlertIndicator />
          <AlertDescription>{authContent.passwordResetConfirm.success}</AlertDescription>
        </Alert>
        <RouterLink className={cn(linkVariants(), "text-center")} to="/mes-dossiers">
          {authContent.passwordResetConfirm.loginLink}
        </RouterLink>
      </CardContent>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <CardContent className="flex flex-col gap-4">
        {confirm.isError ? (
          <Alert variant="destructive">
            <AlertIndicator />
            <AlertDescription>{authErrorMessage(confirm.error)}</AlertDescription>
          </Alert>
        ) : null}

        <Field>
          <FieldLabel htmlFor="password">
            {authContent.passwordResetConfirm.passwordLabel}
          </FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors["password"])}
            placeholder="••••••••••••"
          />
          {errors["password"] ? (
            <FieldError>{errors["password"]}</FieldError>
          ) : (
            <FieldDescription>{authContent.passwordResetConfirm.passwordHint}</FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">
            {authContent.passwordResetConfirm.confirmLabel}
          </FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(errors["confirmPassword"])}
            placeholder="••••••••••••"
          />
          {errors["confirmPassword"] ? <FieldError>{errors["confirmPassword"]}</FieldError> : null}
        </Field>
      </CardContent>
      <CardFooter>
        <Button type="submit" variant="default" className="w-full" pending={confirm.isPending}>
          {authContent.passwordResetConfirm.submitButton}
        </Button>
      </CardFooter>
    </form>
  );
};
