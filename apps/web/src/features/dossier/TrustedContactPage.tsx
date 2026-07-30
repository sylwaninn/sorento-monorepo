import { linkVariants } from "@/components/ui/link";
import { useState, type FormEvent } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  designateTrustedContactInputSchema,
  type DesignateTrustedContactInput,
  type TrustedContactFutureRole,
} from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";
import { useDossier } from "@/hooks/use-dossier";
import { dossierContent } from "@/features/dossier/content";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Heading, Text } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const TrustedContactPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);

  const designationsQuery = useQuery({
    queryKey: queryKeys.dossiers.trustedContacts(dossierId),
    queryFn: () => repositories.trustedContacts.listForDossier(dossierId),
  });

  const revoke = useAppMutation({
    mutationFn: (designationId: string) => repositories.trustedContacts.revoke(designationId),
    invalidates: [queryKeys.dossiers.trustedContacts(dossierId)],
  });

  if (access.isLoading || designationsQuery.isPending) {
    return <PageLoader />;
  }

  if (!access.can("trustedContact:manage")) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
        <Heading level={1}>{dossierContent.trustedContact.title}</Heading>
        <Text tone="muted" size="sm">
          {dossierContent.trustedContact.notice}
        </Text>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Heading level={1}>{dossierContent.trustedContact.title}</Heading>
        <RouterLink className={linkVariants()} to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert>
        <AlertIndicator />
        <AlertDescription>{dossierContent.trustedContact.notice}</AlertDescription>
      </Alert>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {designationsQuery.data && designationsQuery.data.length > 0 ? (
            designationsQuery.data.map((designation) => (
              <div
                key={designation.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Text className="font-medium">{designation.email}</Text>
                  <Text size="sm" tone="muted">
                    {dossierContent.trustedContact.futureRoleOptions[designation.futureRole]} ·{" "}
                    {designation.consentedAt
                      ? dossierContent.trustedContact.statusConsented
                      : dossierContent.trustedContact.statusPending}
                  </Text>
                </div>
                <RevokeDialog
                  email={designation.email}
                  onConfirm={() => revoke.mutate(designation.id)}
                />
              </div>
            ))
          ) : (
            <Text tone="muted" size="sm">
              {dossierContent.trustedContact.empty}
            </Text>
          )}
        </CardContent>
      </Card>

      <DesignateForm dossierId={dossierId} />
    </div>
  );
};

const RevokeDialog = ({ email, onConfirm }: { email: string; onConfirm: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="sm">
        {dossierContent.trustedContact.revokeButton}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="sm:max-w-100">
      <AlertDialogHeader>
        <AlertDialogTitle>{dossierContent.trustedContact.revokeConfirmTitle}</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogDescription>
        {dossierContent.trustedContact.revokeConfirmDescription} ({email})
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>Annuler</AlertDialogCancel>
        <AlertDialogAction variant="destructive" onClick={onConfirm}>
          {dossierContent.trustedContact.revokeConfirmButton}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const DesignateForm = ({ dossierId }: { dossierId: string }) => {
  const [email, setEmail] = useState("");
  const [futureRole, setFutureRole] = useState<TrustedContactFutureRole>("collaborator");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const designate = useAppMutation({
    mutationFn: (input: DesignateTrustedContactInput) =>
      repositories.trustedContacts.designate(input),
    invalidates: [queryKeys.dossiers.trustedContacts(dossierId)],
    onSuccess: () => setEmail(""),
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = designateTrustedContactInputSchema.safeParse({ dossierId, email, futureRole });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    designate.mutate(parsed.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dossierContent.trustedContact.designateButton}</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          {designate.isSuccess ? (
            <Alert variant="success">
              <AlertIndicator />
              <AlertDescription>{dossierContent.trustedContact.success}</AlertDescription>
            </Alert>
          ) : null}
          <ErrorAlert message={designate.errorMessage} />

          <Field>
            <FieldLabel htmlFor="email">{dossierContent.trustedContact.emailLabel}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors["email"])}
              placeholder="contact@exemple.fr"
            />
            {errors["email"] ? <FieldError>{errors["email"]}</FieldError> : null}
          </Field>

          <Select
            value={futureRole}
            onValueChange={(value) =>
              setFutureRole(designateTrustedContactInputSchema.shape.futureRole.parse(value))
            }
          >
            <Label>{dossierContent.trustedContact.futureRoleLabel}</Label>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">
                {dossierContent.trustedContact.futureRoleOptions.owner}
              </SelectItem>
              <SelectItem value="collaborator">
                {dossierContent.trustedContact.futureRoleOptions.collaborator}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
        <CardFooter>
          <Button type="submit" variant="default" pending={designate.isPending}>
            {dossierContent.trustedContact.submitButton}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
