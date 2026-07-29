import { useState, type FormEvent } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { isRoleManageable } from "@sorento/core";
import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Chip,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import {
  createInvitationInputSchema,
  invitableRoleSchema,
  type CreateInvitationInput,
  type DossierRole,
  type InvitableRole,
} from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PageLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useDossier } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";
import { sharedContent } from "@/components/content";

export const MembersPage = () => {
  const { dossierId = "" } = useParams();
  const { user } = useAuth();
  const access = useDossier(dossierId);

  const invitationsQuery = useQuery({
    queryKey: queryKeys.dossiers.invitations(dossierId),
    queryFn: () => repositories.invitations.listPendingForDossier(dossierId),
  });

  const invalidates = [
    queryKeys.dossiers.members(dossierId),
    queryKeys.dossiers.invitations(dossierId),
    queryKeys.dossiers.activity(dossierId),
    // A removed member loses their assignments, so the journey view is stale too.
    queryKeys.dossiers.tracking(dossierId),
  ];

  const changeRole = useAppMutation({
    mutationFn: ({
      membershipId,
      role,
    }: {
      membershipId: string;
      role: Exclude<DossierRole, "owner">;
    }) => repositories.memberships.changeRole(membershipId, role),
    invalidates,
  });

  const removeMember = useAppMutation({
    mutationFn: (membershipId: string) => repositories.memberships.removeMember(membershipId),
    invalidates,
  });

  const revokeInvitation = useAppMutation({
    mutationFn: (invitationId: string) => repositories.invitations.revoke(invitationId),
    invalidates,
  });

  const transferOwnership = useAppMutation({
    mutationFn: (newOwnerUserId: string) =>
      repositories.memberships.transferOwnership(dossierId, newOwnerUserId),
    invalidates,
  });

  if (access.isLoading || invitationsQuery.isPending) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{dossierContent.members.title}</Typography.Heading>
        <RouterLink className="link text-sm" to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <ErrorAlert
        message={
          changeRole.errorMessage ??
          removeMember.errorMessage ??
          revokeInvitation.errorMessage ??
          transferOwnership.errorMessage
        }
      />

      <Card>
        <Card.Header>
          <Card.Title>{dossierContent.members.list.title}</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {access.members.map((member) => {
            const profile = access.profilesById.get(member.userId);
            const isSelf = member.userId === user?.id;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Typography weight="medium">
                    {profile?.firstName ?? member.userId} {isSelf ? "(vous)" : ""}
                  </Typography>
                  <Typography type="body-sm" color="muted">
                    {dossierContent.members.roleLabels[member.role]} ·{" "}
                    {dossierContent.members.list.joinedOn}{" "}
                    {new Date(member.createdAt).toLocaleDateString("fr-FR")}
                  </Typography>
                </div>
                {access.can("members:manage") && !isSelf && isRoleManageable(member.role) ? (
                  <div className="flex items-center gap-2">
                    <RoleSelect
                      role={member.role}
                      onChange={(role) => changeRole.mutate({ membershipId: member.id, role })}
                    />
                    {member.role === "collaborator" ? (
                      <TransferOwnershipDialog
                        memberName={profile?.firstName ?? member.userId}
                        onConfirm={() => transferOwnership.mutate(member.userId)}
                      />
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => removeMember.mutate(member.id)}
                    >
                      {dossierContent.members.list.removeButton}
                    </Button>
                  </div>
                ) : member.role !== "owner" ? (
                  <Chip>{dossierContent.members.roleLabels[member.role]}</Chip>
                ) : null}
              </div>
            );
          })}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>{dossierContent.members.pending.title}</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {invitationsQuery.data && invitationsQuery.data.length > 0 ? (
            invitationsQuery.data.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-3 border-b pb-2 text-sm"
              >
                <div className="flex flex-col">
                  <span>{invitation.email}</span>
                  <Typography color="muted">
                    {dossierContent.members.roleLabels[invitation.role]} ·{" "}
                    {dossierContent.members.pending.expiresOn}{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString("fr-FR")}
                  </Typography>
                </div>
                {access.can("members:manage") ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => revokeInvitation.mutate(invitation.id)}
                  >
                    {dossierContent.members.pending.revokeButton}
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <Typography.Paragraph color="muted" size="sm">
              {dossierContent.members.pending.empty}
            </Typography.Paragraph>
          )}
        </Card.Content>
      </Card>

      {access.can("members:manage") ? <InviteForm dossierId={dossierId} /> : null}
    </div>
  );
};

const RoleSelect = ({
  role,
  onChange,
}: {
  role: Exclude<DossierRole, "owner" | "trusted_contact">;
  onChange: (role: Exclude<DossierRole, "owner">) => void;
}) => (
  <Select value={role} onChange={(value) => onChange(invitableRoleSchema.parse(value))}>
    <Select.Trigger>
      <Select.Value />
      <Select.Indicator />
    </Select.Trigger>
    <Select.Popover>
      <ListBox>
        <ListBox.Item id="collaborator" textValue={dossierContent.members.roleLabels.collaborator}>
          {dossierContent.members.roleLabels.collaborator}
          <ListBox.ItemIndicator />
        </ListBox.Item>
        <ListBox.Item id="viewer" textValue={dossierContent.members.roleLabels.viewer}>
          {dossierContent.members.roleLabels.viewer}
          <ListBox.ItemIndicator />
        </ListBox.Item>
      </ListBox>
    </Select.Popover>
  </Select>
);

const TransferOwnershipDialog = ({
  memberName,
  onConfirm,
}: {
  memberName: string;
  onConfirm: () => void;
}) => (
  <AlertDialog>
    <Button variant="ghost" size="sm">
      {dossierContent.members.list.transferButton}
    </Button>
    <AlertDialog.Backdrop>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[400px]">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="warning" />
            <AlertDialog.Heading>
              {dossierContent.members.list.transferConfirmTitle}
            </AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>
              {dossierContent.members.list.transferConfirmDescription} ({memberName})
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button slot="close" variant="tertiary">
              Annuler
            </Button>
            <Button slot="close" variant="danger" onPress={onConfirm}>
              {dossierContent.members.list.transferConfirmButton}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  </AlertDialog>
);

const InviteForm = ({ dossierId }: { dossierId: string }) => {
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
      <Card.Header>
        <Card.Title>{dossierContent.members.invite.title}</Card.Title>
      </Card.Header>
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          {invite.data ? (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  {dossierContent.members.invite.success} {dossierContent.members.invite.linkNotice}
                  <br />
                  <code className="break-all text-xs">{invite.data.acceptUrl}</code>
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <ErrorAlert message={invite.errorMessage} />

          <TextField
            isRequired
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            isInvalid={Boolean(errors["email"])}
          >
            <Label>{dossierContent.members.invite.emailLabel}</Label>
            <Input placeholder="membre@exemple.fr" />
            {errors["email"] ? <FieldError>{errors["email"]}</FieldError> : null}
          </TextField>

          <Select value={role} onChange={(value) => setRole(invitableRoleSchema.parse(value))}>
            <Label>{dossierContent.members.invite.roleLabel}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item
                  id="collaborator"
                  textValue={dossierContent.members.roleLabels.collaborator}
                >
                  {dossierContent.members.roleLabels.collaborator}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="viewer" textValue={dossierContent.members.roleLabels.viewer}>
                  {dossierContent.members.roleLabels.viewer}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-message">{dossierContent.members.invite.messageLabel}</Label>
            <TextArea
              id="invite-message"
              aria-label={dossierContent.members.invite.messageLabel}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
        </Card.Content>
        <Card.Footer>
          <Button type="submit" variant="primary" isPending={invite.isPending}>
            {dossierContent.members.invite.submitButton}
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
};
