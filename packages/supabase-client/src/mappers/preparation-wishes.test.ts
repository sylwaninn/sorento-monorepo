import { describe, expect, it } from "vitest";
import { mapPreparationWishesRow } from "#client/mappers/preparation-wishes";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type PreparationWishesRow = Database["public"]["Tables"]["preparation_wishes"]["Row"];

const row: PreparationWishesRow = {
  dossier_id: uuid(1),
  funeral_wishes: "Crémation.",
  people_to_notify: "Camille, Dominique.",
  document_location: "Classeur bleu, bureau.",
  updated_at: timestamp(1),
};

describe("mapPreparationWishesRow", () => {
  it("maps every column to its own field", () => {
    expect(mapPreparationWishesRow(row)).toEqual({
      dossierId: uuid(1),
      funeralWishes: "Crémation.",
      peopleToNotify: "Camille, Dominique.",
      documentLocation: "Classeur bleu, bureau.",
      updatedAt: timestamp(1),
    });
  });

  // Three free-text fields of the same type sit next to each other, so the fixture gives each
  // a distinct value and the empty case is asserted per field rather than as a whole.
  it("accepts a sheet where nothing has been filled in yet", () => {
    const empty = mapPreparationWishesRow({
      ...row,
      funeral_wishes: null,
      people_to_notify: null,
      document_location: null,
    });

    expect(empty.funeralWishes).toBeNull();
    expect(empty.peopleToNotify).toBeNull();
    expect(empty.documentLocation).toBeNull();
  });

  it("rejects a dossier reference that is not an id", () => {
    expect(() => mapPreparationWishesRow({ ...row, dossier_id: "dossier-1" })).toThrow();
  });
});
