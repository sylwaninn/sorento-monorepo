import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  createInvitationInputSchema,
  type CreateInvitationInput,
  type InvitableRole,
} from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { dossierContent } from "@/features/dossier/content";
import { RoleSelect } from "@/features/dossier/members/RoleSelect";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

const { invite: inviteContent } = dossierContent.members;

export const InviteForm = ({ dossierId }: { dossierId: string }) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("collaborator");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const invite = useAppMutation({
    mutationFn: (input: CreateInvitationInput) => repositories.invitations.create(input),
    invalidates: [
      queryKeys.dossiers.invitations(dossierId),
      queryKeys.dossiers.activity(dossierId),
    ],
    onSuccess: () => {
      setEmail("");
      setMessage("");
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Parsed at the boundary before anything is sent.
    const parsed = createInvitationInputSchema.safeParse({
      dossierId,
      email,
      role,
      message: message || undefined,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    invite.mutate(parsed.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{inviteContent.title}</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          {invite.data ? (
            <Alert variant="success">
              <AlertIndicator />
              <AlertDescription>
                {inviteContent.success} {inviteContent.linkNotice}
                <br />
                <code className="break-all text-xs">{invite.data.acceptUrl}</code>
              </AlertDescription>
            </Alert>
          ) : null}

          <ErrorAlert message={invite.errorMessage} />

          <Field>
            <FieldLabel htmlFor="email">{inviteContent.emailLabel}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors["email"])}
              placeholder={inviteContent.emailPlaceholder}
            />
            {errors["email"] ? <FieldError>{errors["email"]}</FieldError> : null}
          </Field>

          <RoleSelect label={inviteContent.roleLabel} role={role} onChange={setRole} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-message">{inviteContent.messageLabel}</Label>
            <Textarea
              id="invite-message"
              aria-label={inviteContent.messageLabel}
              value={message}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" variant="default" pending={invite.isPending}>
            {inviteContent.submitButton}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
