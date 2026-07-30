import { invitableRoleSchema, type InvitableRole } from "@sorento/domain";
import { dossierContent } from "@/features/dossier/content";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const { list, roleLabels } = dossierContent.members;

const INVITABLE_ROLES = ["collaborator", "viewer"] as const satisfies readonly InvitableRole[];

export interface RoleSelectProps {
  role: InvitableRole;
  onChange: (role: InvitableRole) => void;
  /** Rendered as a visible field label; without one the control still names itself for readers. */
  label?: string;
}

/**
 * The list of assignable roles, in one place: the member list and the invitation form used to
 * declare their own copy of it, which is one rename away from offering two different sets.
 */
export const RoleSelect = ({ role, onChange, label }: RoleSelectProps) => (
  <Select
    // A labelled field names itself; without a visible label the control still needs a name.
    {...(label ? {} : { "aria-label": list.changeRoleTo })}
    value={role}
    onValueChange={(value) => onChange(invitableRoleSchema.parse(value))}
  >
    {label ? <Label>{label}</Label> : null}
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {INVITABLE_ROLES.map((id) => (
        <SelectItem key={id} value={id} textValue={roleLabels[id]}>
          {roleLabels[id]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
