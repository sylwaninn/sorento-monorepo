import { linkVariants } from "@/components/ui/link";
import { useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import { emailChangeSchema, passwordChangeSchema } from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { useEmailChangeMutation, usePasswordChangeMutation } from "@/auth/use-auth-mutations";
import { fieldErrors } from "@/lib/zod-form-errors";
import { NotificationPreferencesCard } from "@/features/account/NotificationPreferencesCard";
import { AccountDataCard } from "@/features/account/AccountDataCard";
import { accountContent } from "@/features/account/content";
import { sharedContent } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Heading } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

export const SettingsPage = () => (
  <div className="flex min-h-screen flex-col items-center gap-6 p-4 py-12">
    <div className="flex w-full max-w-md items-center justify-between">
      <Heading level={1}>{accountContent.title}</Heading>
      <RouterLink className={linkVariants()} to="/mes-dossiers">
        {sharedContent.back}
      </RouterLink>
    </div>
    <EmailChangeCard />
    <PasswordChangeCard />
    <NotificationPreferencesCard />

    <AccountDataCard />
  </div>
);

const EmailChangeCard = () => {
  const { user } = useAuth();
  const emailChange = useEmailChangeMutation();
  const [newEmail, setNewEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = emailChangeSchema.safeParse({ newEmail });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    emailChange.mutate(result.data.newEmail);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{accountContent.email.title}</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <AlertIndicator />
            <AlertDescription>{accountContent.email.notice}</AlertDescription>
          </Alert>

          {emailChange.isSuccess ? (
            <Alert variant="success">
              <AlertIndicator />
              <AlertDescription>{accountContent.email.success}</AlertDescription>
            </Alert>
          ) : null}

          {emailChange.isError ? (
            <Alert variant="destructive">
              <AlertIndicator />
              <AlertDescription>{authErrorMessage(emailChange.error)}</AlertDescription>
            </Alert>
          ) : null}

          <Field>
            <FieldLabel htmlFor="currentEmail">{accountContent.email.currentLabel}</FieldLabel>
            <Input disabled id="currentEmail" name="currentEmail" value={user?.email ?? ""} />
          </Field>

          <Field>
            <FieldLabel htmlFor="newEmail">{accountContent.email.newLabel}</FieldLabel>
            <Input
              id="newEmail"
              name="newEmail"
              type="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              aria-invalid={Boolean(errors["newEmail"])}
              placeholder="nouvelle-adresse@exemple.fr"
            />
            {errors["newEmail"] ? <FieldError>{errors["newEmail"]}</FieldError> : null}
          </Field>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            variant="default"
            className="w-full"
            pending={emailChange.isPending}
          >
            {accountContent.email.button}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

const PasswordChangeCard = () => {
  const { user } = useAuth();
  const passwordChange = usePasswordChangeMutation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = passwordChangeSchema.safeParse({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    if (!user?.email) return;
    setErrors({});
    passwordChange.mutate(
      { currentEmail: user.email, currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
        },
      },
    );
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{accountContent.password.title}</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          {passwordChange.isSuccess ? (
            <Alert variant="success">
              <AlertIndicator />
              <AlertDescription>{accountContent.password.success}</AlertDescription>
            </Alert>
          ) : null}

          {passwordChange.isError ? (
            <Alert variant="destructive">
              <AlertIndicator />
              <AlertDescription>{authErrorMessage(passwordChange.error)}</AlertDescription>
            </Alert>
          ) : null}

          <Field>
            <FieldLabel htmlFor="currentPassword">
              {accountContent.password.currentLabel}
            </FieldLabel>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              aria-invalid={Boolean(errors["currentPassword"])}
              placeholder="••••••••••••"
            />
            {errors["currentPassword"] ? (
              <FieldError>{errors["currentPassword"]}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="newPassword">{accountContent.password.newLabel}</FieldLabel>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              aria-invalid={Boolean(errors["newPassword"])}
              placeholder="••••••••••••"
            />
            {errors["newPassword"] ? <FieldError>{errors["newPassword"]}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmNewPassword">
              {accountContent.password.confirmLabel}
            </FieldLabel>
            <Input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              required
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              aria-invalid={Boolean(errors["confirmNewPassword"])}
              placeholder="••••••••••••"
            />
            {errors["confirmNewPassword"] ? (
              <FieldError>{errors["confirmNewPassword"]}</FieldError>
            ) : null}
          </Field>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            variant="default"
            className="w-full"
            pending={passwordChange.isPending}
          >
            {accountContent.password.button}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
