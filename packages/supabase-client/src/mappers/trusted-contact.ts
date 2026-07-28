import { trustedContactDesignationSchema, type TrustedContactDesignation } from "@sorento/domain";
import type { Database } from "#client/database.types";

type TrustedContactDesignationRow =
  Database["public"]["Tables"]["trusted_contact_designations"]["Row"];

export const mapTrustedContactDesignationRow = (
  row: TrustedContactDesignationRow,
): TrustedContactDesignation =>
  trustedContactDesignationSchema.parse({
    id: row.id,
    dossierId: row.dossier_id,
    email: row.email,
    futureRole: row.future_role,
    consentedAt: row.consented_at,
    activationExpiresAt: row.activation_expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  });
