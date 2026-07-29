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
import { passwordResetRequestSchema } from "@sorento/domain";
import { fieldErrors } from "@/lib/zod-form-errors";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { usePasswordResetRequestMutation } from "@/auth/use-auth-mutations";
import { authContent } from "@/features/auth/content";

export const PasswordResetRequestPage = () => {
  const request = usePasswordResetRequestMutation();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = passwordResetRequestSchema.safeParse({ email });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    request.mutate(result.data.email);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{authContent.passwordResetRequest.title}</Card.Title>
          <Card.Description>{authContent.passwordResetRequest.description}</Card.Description>
        </Card.Header>

        {request.isSuccess ? (
          <Card.Content>
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  {authContent.passwordResetRequest.confirmation}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          </Card.Content>
        ) : (
          <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Card.Content className="flex flex-col gap-4">
              {request.isError ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{authErrorMessage(request.error)}</Alert.Description>
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
                <Label>{authContent.passwordResetRequest.emailLabel}</Label>
                <Input placeholder="vous@exemple.fr" />
                {errors["email"] ? <FieldError>{errors["email"]}</FieldError> : null}
              </TextField>
            </Card.Content>
            <Card.Footer>
              <Button type="submit" variant="primary" fullWidth isPending={request.isPending}>
                {authContent.passwordResetRequest.submitButton}
              </Button>
            </Card.Footer>
          </Form>
        )}

        <Card.Footer>
          <Typography.Paragraph align="center" size="sm">
            <RouterLink className="link" to="/connexion">
              {authContent.passwordResetRequest.backToLogin}
            </RouterLink>
          </Typography.Paragraph>
        </Card.Footer>
      </Card>
    </div>
  );
};
