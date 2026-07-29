import { useState, type FormEvent } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertDialog,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
  Typography,
} from "@heroui/react";
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

export const TrustedContactPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);

  const designationsQuery = useQuery({
    queryKey: ["dossier-trusted-contacts", dossierId],
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
        <Typography.Heading level={1}>{dossierContent.trustedContact.title}</Typography.Heading>
        <Typography.Paragraph color="muted" size="sm">
          {dossierContent.trustedContact.notice}
        </Typography.Paragraph>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{dossierContent.trustedContact.title}</Typography.Heading>
        <RouterLink className="link text-sm" to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{dossierContent.trustedContact.notice}</Alert.Description>
        </Alert.Content>
      </Alert>

      <Card>
        <Card.Content className="flex flex-col gap-3 py-4">
          {designationsQuery.data && designationsQuery.data.length > 0 ? (
            designationsQuery.data.map((designation) => (
              <div
                key={designation.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Typography weight="medium">{designation.email}</Typography>
                  <Typography type="body-sm" color="muted">
                    {dossierContent.trustedContact.futureRoleOptions[designation.futureRole]} ·{" "}
                    {designation.consentedAt
                      ? dossierContent.trustedContact.statusConsented
                      : dossierContent.trustedContact.statusPending}
                  </Typography>
                </div>
                <RevokeDialog
                  email={designation.email}
                  onConfirm={() => revoke.mutate(designation.id)}
                />
              </div>
            ))
          ) : (
            <Typography.Paragraph color="muted" size="sm">
              {dossierContent.trustedContact.empty}
            </Typography.Paragraph>
          )}
        </Card.Content>
      </Card>

      <DesignateForm dossierId={dossierId} />
    </div>
  );
};

const RevokeDialog = ({ email, onConfirm }: { email: string; onConfirm: () => void }) => (
  <AlertDialog>
    <Button variant="ghost" size="sm">
      {dossierContent.trustedContact.revokeButton}
    </Button>
    <AlertDialog.Backdrop>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[400px]">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="warning" />
            <AlertDialog.Heading>
              {dossierContent.trustedContact.revokeConfirmTitle}
            </AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>
              {dossierContent.trustedContact.revokeConfirmDescription} ({email})
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button slot="close" variant="tertiary">
              Annuler
            </Button>
            <Button slot="close" variant="danger" onPress={onConfirm}>
              {dossierContent.trustedContact.revokeConfirmButton}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
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
      <Card.Header>
        <Card.Title>{dossierContent.trustedContact.designateButton}</Card.Title>
      </Card.Header>
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          {designate.isSuccess ? (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{dossierContent.trustedContact.success}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
          <ErrorAlert message={designate.errorMessage} />

          <TextField
            isRequired
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            isInvalid={Boolean(errors["email"])}
          >
            <Label>{dossierContent.trustedContact.emailLabel}</Label>
            <Input placeholder="contact@exemple.fr" />
            {errors["email"] ? <FieldError>{errors["email"]}</FieldError> : null}
          </TextField>

          <Select
            value={futureRole}
            onChange={(value) =>
              setFutureRole(designateTrustedContactInputSchema.shape.futureRole.parse(value))
            }
          >
            <Label>{dossierContent.trustedContact.futureRoleLabel}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item
                  id="owner"
                  textValue={dossierContent.trustedContact.futureRoleOptions.owner}
                >
                  {dossierContent.trustedContact.futureRoleOptions.owner}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item
                  id="collaborator"
                  textValue={dossierContent.trustedContact.futureRoleOptions.collaborator}
                >
                  {dossierContent.trustedContact.futureRoleOptions.collaborator}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </Card.Content>
        <Card.Footer>
          <Button type="submit" variant="primary" isPending={designate.isPending}>
            {dossierContent.trustedContact.submitButton}
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
};
