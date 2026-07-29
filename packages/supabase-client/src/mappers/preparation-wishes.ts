import { preparationWishesSchema, type PreparationWishes } from "@sorento/domain";
import type { Database } from "#client/database.types";

type PreparationWishesRow = Database["public"]["Tables"]["preparation_wishes"]["Row"];

export const mapPreparationWishesRow = (row: PreparationWishesRow): PreparationWishes =>
  preparationWishesSchema.parse({
    dossierId: row.dossier_id,
    funeralWishes: row.funeral_wishes,
    peopleToNotify: row.people_to_notify,
    documentLocation: row.document_location,
    updatedAt: row.updated_at,
  });
