import type {
  PreparationWishes,
  PreparationWishesInput,
  PreparationWishesPort,
} from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError } from "#client/errors";
import { mapPreparationWishesRow } from "#client/mappers";

export class PreparationWishesRepository implements PreparationWishesPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  getForDossier = async (dossierId: string): Promise<PreparationWishes | null> => {
    const { data, error } = await this.client
      .from("preparation_wishes")
      .select()
      .eq("dossier_id", dossierId)
      .maybeSingle();

    assertNoError(error, "get preparation wishes");
    return data ? mapPreparationWishesRow(data) : null;
  };

  upsert = async (dossierId: string, input: PreparationWishesInput): Promise<PreparationWishes> => {
    const { data, error } = await this.client
      .from("preparation_wishes")
      .upsert({
        dossier_id: dossierId,
        funeral_wishes: input.funeralWishes ?? null,
        people_to_notify: input.peopleToNotify ?? null,
        document_location: input.documentLocation ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    assertNoError(error, "save preparation wishes");
    if (!data) throw new Error("save preparation wishes: no data returned");
    return mapPreparationWishesRow(data);
  };
}
