import { profileSchema, type Profile } from "@sorento/domain";
import type { Database } from "#client/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const mapProfileRow = (row: ProfileRow): Profile =>
  profileSchema.parse({
    id: row.id,
    firstName: row.first_name,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
