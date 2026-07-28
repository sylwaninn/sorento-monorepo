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
  TextField,
  Typography,
} from "@heroui/react";
import { emailChangeSchema, passwordChangeSchema } from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { useEmailChangeMutation, usePasswordChangeMutation } from "@/auth/use-auth-mutations";
import { fieldErrors } from "@/lib/zod-form-errors";
import { NotificationPreferencesCard } from "@/features/account/NotificationPreferencesCard";
import { AccountDataCard } from "@/features/account/AccountDataCard";
import { accountContent } from "@/features/account/content";
import { sharedContent } from "@/components/content";

export const SettingsPage = () => (
  <div className="flex min-h-screen flex-col items-center gap-6 p-4 py-12">
    <div className="flex w-full max-w-md items-center justify-between">
      <Typography.Heading level={1}>{accountContent.title}</Typography.Heading>
      <RouterLink className="link text-sm" to="/mes-dossiers">
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
      <Card.Header>
        <Card.Title>{accountContent.email.title}</Card.Title>
      </Card.Header>
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          <Alert status="default">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{accountContent.email.notice}</Alert.Description>
            </Alert.Content>
          </Alert>

          {emailChange.isSuccess ? (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{accountContent.email.success}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {emailChange.isError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{authErrorMessage(emailChange.error)}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <TextField isDisabled name="currentEmail" value={user?.email ?? ""} onChange={() => {}}>
            <Label>{accountContent.email.currentLabel}</Label>
            <Input />
          </TextField>

          <TextField
            isRequired
            name="newEmail"
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            isInvalid={Boolean(errors["newEmail"])}
          >
            <Label>{accountContent.email.newLabel}</Label>
            <Input placeholder="nouvelle-adresse@exemple.fr" />
            {errors["newEmail"] ? <FieldError>{errors["newEmail"]}</FieldError> : null}
          </TextField>
        </Card.Content>
        <Card.Footer>
          <Button type="submit" variant="primary" fullWidth isPending={emailChange.isPending}>
            {accountContent.email.button}
          </Button>
        </Card.Footer>
      </Form>
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
      <Card.Header>
        <Card.Title>{accountContent.password.title}</Card.Title>
      </Card.Header>
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          {passwordChange.isSuccess ? (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{accountContent.password.success}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {passwordChange.isError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{authErrorMessage(passwordChange.error)}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <TextField
            isRequired
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            isInvalid={Boolean(errors["currentPassword"])}
          >
            <Label>{accountContent.password.currentLabel}</Label>
            <Input placeholder="••••••••••••" />
            {errors["currentPassword"] ? (
              <FieldError>{errors["currentPassword"]}</FieldError>
            ) : null}
          </TextField>

          <TextField
            isRequired
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            isInvalid={Boolean(errors["newPassword"])}
          >
            <Label>{accountContent.password.newLabel}</Label>
            <Input placeholder="••••••••••••" />
            {errors["newPassword"] ? <FieldError>{errors["newPassword"]}</FieldError> : null}
          </TextField>

          <TextField
            isRequired
            name="confirmNewPassword"
            type="password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            isInvalid={Boolean(errors["confirmNewPassword"])}
          >
            <Label>{accountContent.password.confirmLabel}</Label>
            <Input placeholder="••••••••••••" />
            {errors["confirmNewPassword"] ? (
              <FieldError>{errors["confirmNewPassword"]}</FieldError>
            ) : null}
          </TextField>
        </Card.Content>
        <Card.Footer>
          <Button type="submit" variant="primary" fullWidth isPending={passwordChange.isPending}>
            {accountContent.password.button}
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
};
