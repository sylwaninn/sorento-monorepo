import { useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
  Typography,
} from "@heroui/react";
import { signupSchema } from "@sorento/domain";
import { env } from "@/lib/env";
import { fieldErrors } from "@/lib/zod-form-errors";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { useDevSignupMutation, useSignupMutation } from "@/auth/use-auth-mutations";
import { attachDiagnosticFromSession } from "@/features/diagnostic/attach-diagnostic";
import { authContent } from "@/features/auth/content";

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{authContent.signup.title}</Card.Title>
          <Card.Description>{authContent.signup.description}</Card.Description>
        </Card.Header>
        <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Card.Content className="flex flex-col gap-4">
            {submitError ? (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{authErrorMessage(submitError)}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <TextField
              isRequired
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              isInvalid={Boolean(errors["email"])}
            >
              <Label>{authContent.signup.emailLabel}</Label>
              <Input placeholder="vous@exemple.fr" />
              {errors["email"] ? <FieldError>{errors["email"]}</FieldError> : null}
            </TextField>

            <TextField
              isRequired
              name="password"
              type="password"
              value={password}
              onChange={setPassword}
              isInvalid={Boolean(errors["password"])}
            >
              <Label>{authContent.signup.passwordLabel}</Label>
              <Input placeholder="••••••••••••" />
              {errors["password"] ? (
                <FieldError>{errors["password"]}</FieldError>
              ) : (
                <Description>{authContent.signup.passwordHint}</Description>
              )}
            </TextField>

            <Checkbox
              isRequired
              isSelected={acceptTerms}
              onChange={setAcceptTerms}
              name="acceptTerms"
              isInvalid={Boolean(errors["acceptTerms"])}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                {authContent.signup.termsLabel}
              </Checkbox.Content>
              {errors["acceptTerms"] ? <FieldError>{errors["acceptTerms"]}</FieldError> : null}
            </Checkbox>

            {env.isDevelopment ? (
              <Checkbox
                isSelected={skipEmailConfirmation}
                onChange={setSkipEmailConfirmation}
                name="skipEmailConfirmation"
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  {authContent.signup.devSkipConfirmationLabel}
                </Checkbox.Content>
                <Description>{authContent.signup.devSkipConfirmationHint}</Description>
              </Checkbox>
            ) : null}
          </Card.Content>

          <Card.Footer className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isPending={signup.isPending || devSignup.isPending}
            >
              {authContent.signup.submitButton}
            </Button>
            <Typography.Paragraph align="center" size="sm">
              {authContent.signup.alreadyHaveAccount}{" "}
              <RouterLink className="link" to="/connexion">
                {authContent.signup.loginLink}
              </RouterLink>
            </Typography.Paragraph>
          </Card.Footer>
        </Form>
      </Card>
    </div>
  );
};
