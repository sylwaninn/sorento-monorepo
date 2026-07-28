import { describe, expect, it } from "vitest";
import { mapAnswerRow } from "#client/mappers/answer";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type AnswerRow = Database["public"]["Tables"]["answers"]["Row"];

const row: AnswerRow = {
  id: uuid(1),
  dossier_id: uuid(2),
  key: "mode",
  value: "death",
  created_at: timestamp(1),
  updated_at: timestamp(2),
};

describe("mapAnswerRow", () => {
  it("maps every column to its own field", () => {
    expect(mapAnswerRow(row)).toEqual({
      id: uuid(1),
      dossierId: uuid(2),
      key: "mode",
      value: "death",
      createdAt: timestamp(1),
      updatedAt: timestamp(2),
    });
  });

  // The column is jsonb and the engine reads four shapes out of it; a value the union does not
  // cover would reach condition evaluation as an unexpected type.
  it("carries every answer shape the engine consumes", () => {
    expect(mapAnswerRow({ ...row, value: 42 }).value).toBe(42);
    expect(mapAnswerRow({ ...row, value: true }).value).toBe(true);
    expect(mapAnswerRow({ ...row, value: ["a", "b"] }).value).toEqual(["a", "b"]);
  });

  it("rejects a shape outside the union", () => {
    expect(() => mapAnswerRow({ ...row, value: { nested: true } })).toThrow();
  });

  it("rejects an empty question key", () => {
    expect(() => mapAnswerRow({ ...row, key: "" })).toThrow();
  });
});
