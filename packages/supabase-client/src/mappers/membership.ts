import { membershipSchema, type Membership } from "@sorento/domain";
import type { Database } from "#client/database.types";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];

export const mapMembershipRow = (row: MembershipRow): Membership =>
  membershipSchema.parse({
    id: row.id,
    dossierId: row.dossier_id,
    userId: row.user_id,
    role: row.role,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
