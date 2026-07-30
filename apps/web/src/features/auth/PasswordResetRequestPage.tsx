import { linkVariants } from "@/components/ui/link";
import { useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import { passwordResetRequestSchema } from "@sorento/domain";
import { fieldErrors } from "@/lib/zod-form-errors";
import { authErrorMessage } from "@/auth/auth-error-messages";
import { usePasswordResetRequestMutation } from "@/auth/use-auth-mutations";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

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
        <CardHeader>
          <CardTitle>{authContent.passwordResetRequest.title}</CardTitle>
          <CardDescription>{authContent.passwordResetRequest.description}</CardDescription>
        </CardHeader>

        {request.isSuccess ? (
          <CardContent>
            <Alert variant="success">
              <AlertIndicator />
              <AlertDescription>{authContent.passwordResetRequest.confirmation}</AlertDescription>
            </Alert>
          </CardContent>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <CardContent className="flex flex-col gap-4">
              {request.isError ? (
                <Alert variant="destructive">
                  <AlertIndicator />
                  <AlertDescription>{authErrorMessage(request.error)}</AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <FieldLabel htmlFor="email">
                  {authContent.passwordResetRequest.emailLabel}
                </FieldLabel>
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
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                variant="default"
                className="w-full"
                pending={request.isPending}
              >
                {authContent.passwordResetRequest.submitButton}
              </Button>
            </CardFooter>
          </form>
        )}

        <CardFooter>
          <Text align="center" size="sm">
            <RouterLink className={linkVariants({ size: "inherit" })} to="/connexion">
              {authContent.passwordResetRequest.backToLogin}
            </RouterLink>
          </Text>
        </CardFooter>
      </Card>
    </div>
  );
};
