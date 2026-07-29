import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import {
  Alert,
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { passwordResetConfirmSchema } from "@sorento/domain";
import { supabase } from "@/lib/supabase-client";
import { fieldErrors } from "@/lib/zod-form-errors";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { usePasswordResetConfirmMutation } from "@/auth/use-auth-mutations";
import { authContent } from "@/features/auth/content";
import { InlineLoader } from "@/components/PageLoader";

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{authContent.passwordResetConfirm.title}</Card.Title>
        </Card.Header>
        {linkState === "loading" ? (
          <InlineLoader />
        ) : linkState === "invalid" ? (
          <Card.Content className="flex flex-col gap-4">
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{authContent.passwordResetConfirm.invalidLinkTitle}</Alert.Title>
                <Alert.Description>
                  {authContent.passwordResetConfirm.invalidLinkDescription}
                </Alert.Description>
              </Alert.Content>
            </Alert>
            <RouterLink className="link text-center text-sm" to="/mot-de-passe-oublie">
              {authContent.passwordResetConfirm.requestNewLink}
            </RouterLink>
          </Card.Content>
        ) : (
          <NewPasswordForm />
        )}
      </Card>
    </div>
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
      <Card.Content className="flex flex-col gap-4">
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{authContent.passwordResetConfirm.success}</Alert.Description>
          </Alert.Content>
        </Alert>
        <RouterLink className="link text-center text-sm" to="/mes-dossiers">
          {authContent.passwordResetConfirm.loginLink}
        </RouterLink>
      </Card.Content>
    );
  }

  return (
    <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <Card.Content className="flex flex-col gap-4">
        {confirm.isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{authErrorMessage(confirm.error)}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <TextField
          isRequired
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          isInvalid={Boolean(errors["password"])}
        >
          <Label>{authContent.passwordResetConfirm.passwordLabel}</Label>
          <Input placeholder="••••••••••••" />
          {errors["password"] ? (
            <FieldError>{errors["password"]}</FieldError>
          ) : (
            <Description>{authContent.passwordResetConfirm.passwordHint}</Description>
          )}
        </TextField>

        <TextField
          isRequired
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          isInvalid={Boolean(errors["confirmPassword"])}
        >
          <Label>{authContent.passwordResetConfirm.confirmLabel}</Label>
          <Input placeholder="••••••••••••" />
          {errors["confirmPassword"] ? <FieldError>{errors["confirmPassword"]}</FieldError> : null}
        </TextField>
      </Card.Content>
      <Card.Footer>
        <Button type="submit" variant="primary" fullWidth isPending={confirm.isPending}>
          {authContent.passwordResetConfirm.submitButton}
        </Button>
      </Card.Footer>
    </Form>
  );
};
