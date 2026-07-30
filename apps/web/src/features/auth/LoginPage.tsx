import { linkVariants } from "@/components/ui/link";
import { useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import { z } from "zod";
import { magicLinkLoginSchema, passwordLoginSchema } from "@sorento/domain";
import { fieldErrors } from "@/lib/zod-form-errors";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { useMagicLinkLoginMutation, usePasswordLoginMutation } from "@/auth/use-auth-mutations";
import { authContent } from "@/features/auth/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Text } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginModeSchema = z.enum(["password", "magic-link"]);

export const LoginPage = () => {
  const [mode, setMode] = useState<"password" | "magic-link">("password");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{authContent.login.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(key) => setMode(loginModeSchema.parse(String(key)))}>
            <TabsList aria-label="Méthode de connexion">
              <TabsTrigger value="password">{authContent.login.passwordTab}</TabsTrigger>
              <TabsTrigger value="magic-link">{authContent.login.magicLinkTab}</TabsTrigger>
            </TabsList>
            <TabsContent value="password">
              <PasswordLoginForm />
            </TabsContent>
            <TabsContent value="magic-link">
              <MagicLinkLoginForm />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Text align="center" size="sm">
            {authContent.login.noAccount}{" "}
            <RouterLink className={linkVariants({ size: "inherit" })} to="/inscription">
              {authContent.login.signupLink}
            </RouterLink>
          </Text>
        </CardFooter>
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

  const loginErrorCode =
    login.error !== null &&
    typeof login.error === "object" &&
    "code" in login.error &&
    typeof login.error.code === "string"
      ? login.error.code
      : undefined;
  const emailNotConfirmed = login.isError && loginErrorCode === "email_not_confirmed";

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
    <form className="flex flex-col gap-4 pt-4" onSubmit={onSubmit}>
      {login.isError ? (
        <Alert variant="destructive">
          <AlertIndicator />
          <AlertDescription>{authErrorMessage(login.error)}</AlertDescription>
          {emailNotConfirmed ? (
            <Button
              variant="ghost"
              size="sm"
              pending={resendMagicLink.isPending}
              onClick={() => resendMagicLink.mutate(email)}
            >
              {authContent.login.resendConfirmationLink}
            </Button>
          ) : null}
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor="email">{authContent.login.emailLabel}</FieldLabel>
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
        <FieldLabel htmlFor="password">{authContent.login.passwordLabel}</FieldLabel>
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
        {errors["password"] ? <FieldError>{errors["password"]}</FieldError> : null}
      </Field>

      <RouterLink className={linkVariants()} to="/mot-de-passe-oublie">
        {authContent.login.forgotPasswordLink}
      </RouterLink>

      <Button type="submit" variant="default" className="w-full" pending={login.isPending}>
        {authContent.login.submitButtonPassword}
      </Button>
    </form>
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
    <form className="flex flex-col gap-4 pt-4" onSubmit={onSubmit}>
      {magicLink.isError ? (
        <Alert variant="destructive">
          <AlertIndicator />
          <AlertDescription>{authErrorMessage(magicLink.error)}</AlertDescription>
        </Alert>
      ) : null}

      {magicLink.isSuccess ? (
        <Alert variant="success">
          <AlertIndicator />
          <AlertDescription>{authContent.login.magicLinkSent}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor="email">{authContent.login.emailLabel}</FieldLabel>
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

      <Button type="submit" variant="default" className="w-full" pending={magicLink.isPending}>
        {authContent.login.submitButtonMagicLink}
      </Button>
    </form>
  );
};
