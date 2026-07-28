import { invitationSchema, type Invitation } from "@sorento/domain";
import type { Database } from "#client/database.types";

type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

export const mapInvitationRow = (row: InvitationRow): Invitation =>
  invitationSchema.parse({
    id: row.id,
    dossierId: row.dossier_id,
    email: row.email,
    role: row.role,
    message: row.message,
    invitedBy: row.invited_by,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  });
