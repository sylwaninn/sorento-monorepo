import { z } from "zod";
import {
  createInvitationInputSchema,
  dateSchema,
  designateTrustedContactInputSchema,
  idSchema,
} from "@sorento/domain";

/**
 * Edge Function payloads, built from the domain schemas rather than redeclared, so a change
 * to a domain rule propagates here instead of drifting.
 */

// 32 random bytes, hex-encoded by _shared/token.ts. Constraining the shape here means a
// malformed token never reaches a database lookup.
export const applicationTokenSchema = z.string().regex(/^[0-9a-f]{64}$/, "Token invalide.");

export const tokenPayloadSchema = z.object({ token: applicationTokenSchema });

export const inviteMemberPayloadSchema = createInvitationInputSchema;

export const acceptInvitationPayloadSchema = tokenPayloadSchema;

export const designateTrustedContactPayloadSchema = designateTrustedContactInputSchema;

export const consentTrustedContactPayloadSchema = tokenPayloadSchema;

// The document path is produced by the client upload and then read back through Storage, so
// it is constrained to the {dossier_id}/{category}/{uuid}.{ext} layout the bucket policies
// assume — a free-form string here would be a path-traversal surface.
const documentPathSchema = z
  .string()
  .regex(
    /^[0-9a-f-]{36}\/[a-z0-9_-]+\/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$/i,
    "Chemin de document invalide.",
  );

export const requestActivationPayloadSchema = z.object({
  token: applicationTokenSchema,
  deathDate: dateSchema,
  documentPath: documentPathSchema.optional(),
});

export const opposeActivationPayloadSchema = z.object({
  dossierId: idSchema,
  reason: z.string().max(2000).optional(),
});
