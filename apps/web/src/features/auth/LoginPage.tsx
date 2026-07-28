import { useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import {
  Alert,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  Tabs,
  TextField,
  Typography,
} from "@heroui/react";
import { magicLinkLoginSchema, passwordLoginSchema } from "@sorento/domain";
import { fieldErrors } from "@/lib/zod-form-errors";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { useMagicLinkLoginMutation, usePasswordLoginMutation } from "@/auth/use-auth-mutations";
import { authContent } from "@/features/auth/content";

export const LoginPage = () => {
  const [mode, setMode] = useState<"password" | "magic-link">("password");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{authContent.login.title}</Card.Title>
        </Card.Header>
        <Card.Content>
          <Tabs
            selectedKey={mode}
            onSelectionChange={(key) => setMode(key as "password" | "magic-link")}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Méthode de connexion">
                <Tabs.Tab id="password">
                  {authContent.login.passwordTab}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="magic-link">
                  {authContent.login.magicLinkTab}
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="password">
              <PasswordLoginForm />
            </Tabs.Panel>
            <Tabs.Panel id="magic-link">
              <MagicLinkLoginForm />
            </Tabs.Panel>
          </Tabs>
        </Card.Content>
        <Card.Footer>
          <Typography.Paragraph align="center" size="sm">
            {authContent.login.noAccount}{" "}
            <RouterLink className="link" to="/inscription">
              {authContent.login.signupLink}
            </RouterLink>
          </Typography.Paragraph>
        </Card.Footer>
      </Card>
    </div>
  );
};

const PasswordLoginForm = () => {
  const login = usePasswordLoginMutation();
  const resendMagicLink = useMagicLinkLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailNotConfirmed =
    login.isError &&
    typeof login.error === "object" &&
    login.error !== null &&
    "code" in login.error &&
    (login.error as { code?: string }).code === "email_not_confirmed";

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = passwordLoginSchema.safeParse({ email, password });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    login.mutate(result.data);
  };

  return (
    <Form className="flex flex-col gap-4 pt-4" onSubmit={onSubmit}>
      {login.isError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{authErrorMessage(login.error)}</Alert.Description>
            {emailNotConfirmed ? (
              <Button
                variant="ghost"
                size="sm"
                isPending={resendMagicLink.isPending}
                onPress={() => resendMagicLink.mutate(email)}
              >
                {authContent.login.resendConfirmationLink}
              </Button>
            ) : null}
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
        <Label>{authContent.login.emailLabel}</Label>
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
        <Label>{authContent.login.passwordLabel}</Label>
        <Input placeholder="••••••••••••" />
        {errors["password"] ? <FieldError>{errors["password"]}</FieldError> : null}
      </TextField>

      <RouterLink className="link text-sm" to="/mot-de-passe-oublie">
        {authContent.login.forgotPasswordLink}
      </RouterLink>

      <Button type="submit" variant="primary" fullWidth isPending={login.isPending}>
        {authContent.login.submitButtonPassword}
      </Button>
    </Form>
  );
};

const MagicLinkLoginForm = () => {
  const magicLink = useMagicLinkLoginMutation();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = magicLinkLoginSchema.safeParse({ email });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    magicLink.mutate(result.data.email);
  };

  return (
    <Form className="flex flex-col gap-4 pt-4" onSubmit={onSubmit}>
      {magicLink.isError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{authErrorMessage(magicLink.error)}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {magicLink.isSuccess ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{authContent.login.magicLinkSent}</Alert.Description>
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
        <Label>{authContent.login.emailLabel}</Label>
        <Input placeholder="vous@exemple.fr" />
        {errors["email"] ? <FieldError>{errors["email"]}</FieldError> : null}
      </TextField>

      <Button type="submit" variant="primary" fullWidth isPending={magicLink.isPending}>
        {authContent.login.submitButtonMagicLink}
      </Button>
    </Form>
  );
};
