import { useId } from "react";
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
export const RoleSelect = ({ role, onChange, label }: RoleSelectProps) => {
  // The trigger is what carries the name, so the visible label has to point at it. Rendering the
  // label beside an unassociated trigger leaves the control anonymous to a screen reader.
  const triggerId = useId();

  return (
    <Select value={role} onValueChange={(value) => onChange(invitableRoleSchema.parse(value))}>
      {label ? <Label htmlFor={triggerId}>{label}</Label> : null}
      <SelectTrigger id={triggerId} {...(label ? {} : { "aria-label": list.changeRoleTo })}>
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
};
