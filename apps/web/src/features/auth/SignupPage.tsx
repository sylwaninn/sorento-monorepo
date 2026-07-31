import { CenteredShell } from "@/layout/CenteredShell";
import { linkVariants } from "@/components/ui/link";
import { useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import { signupSchema } from "@sorento/domain";
import { env } from "@/lib/env";
import { fieldErrors } from "@/lib/zod-form-errors";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { useDevSignupMutation, useSignupMutation } from "@/auth/use-auth-mutations";
import { attachDiagnosticFromSession } from "@/features/diagnostic/attach-diagnostic";
import { authContent } from "@/features/auth/content";
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
import { Text } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

export const SignupPage = () => {
  const navigate = useNavigate();
  const signup = useSignupMutation();
  const devSignup = useDevSignupMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [skipEmailConfirmation, setSkipEmailConfirmation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submitError = signup.error ?? devSignup.error;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = signupSchema.safeParse({ email, password, acceptTerms });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});

    // The confirmation email never gets sent here, so the diagnostic attachment that normally
    // happens on VerifyEmailPage has to happen on this path instead.
    if (env.isDevelopment && skipEmailConfirmation) {
      devSignup.mutate(result.data, {
        onSuccess: async () => {
          const dossierId = await attachDiagnosticFromSession();
          navigate(dossierId === null ? "/mes-dossiers" : `/dossiers/${dossierId}`, {
            replace: true,
          });
        },
      });
      return;
    }

    signup.mutate(result.data, {
      onSuccess: () => navigate("/verification-email", { state: { email: result.data.email } }),
    });
  };

  return (
    <CenteredShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{authContent.signup.title}</CardTitle>
          <CardDescription>{authContent.signup.description}</CardDescription>
        </CardHeader>
        {/*
          Zod owns this form's validation, so the browser's must not also run: it blocks the
          submit before onSubmit fires, and the terms checkbox is a button rather than a native
          input, leaving the browser's message nothing to point at. Pressing the button with the
          terms unticked did nothing at all, with no explanation on screen.
        */}
        <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-4">
            {submitError ? (
              <Alert variant="destructive">
                <AlertIndicator />
                <AlertDescription>{authErrorMessage(submitError)}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <FieldLabel htmlFor="email">{authContent.signup.emailLabel}</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors["email"])}
                placeholder="vous@exemple.fr"
              />
              {errors["email"] ? <FieldError>{errors["email"]}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="password">{authContent.signup.passwordLabel}</FieldLabel>
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
                <FieldDescription>{authContent.signup.passwordHint}</FieldDescription>
              )}
            </Field>

            <Field>
              <Field orientation="horizontal">
                <Checkbox
                  aria-invalid={Boolean(errors["acceptTerms"])}
                  checked={acceptTerms}
                  id="acceptTerms"
                  name="acceptTerms"
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  required
                />
                <FieldLabel htmlFor="acceptTerms">{authContent.signup.termsLabel}</FieldLabel>
              </Field>
              {errors["acceptTerms"] ? <FieldError>{errors["acceptTerms"]}</FieldError> : null}
            </Field>

            {env.isDevelopment ? (
              <Field>
                <Field orientation="horizontal">
                  <Checkbox
                    checked={skipEmailConfirmation}
                    id="skipEmailConfirmation"
                    name="skipEmailConfirmation"
                    onCheckedChange={(checked) => setSkipEmailConfirmation(checked === true)}
                  />
                  <FieldLabel htmlFor="skipEmailConfirmation">
                    {authContent.signup.devSkipConfirmationLabel}
                  </FieldLabel>
                </Field>
                <FieldDescription>{authContent.signup.devSkipConfirmationHint}</FieldDescription>
              </Field>
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="default"
              className="w-full"
              pending={signup.isPending || devSignup.isPending}
            >
              {authContent.signup.submitButton}
            </Button>
            <Text align="center" size="sm">
              {authContent.signup.alreadyHaveAccount}{" "}
              <RouterLink className={linkVariants({ size: "inherit" })} to="/connexion">
                {authContent.signup.loginLink}
              </RouterLink>
            </Text>
          </CardFooter>
        </form>
      </Card>
    </CenteredShell>
  );
};
