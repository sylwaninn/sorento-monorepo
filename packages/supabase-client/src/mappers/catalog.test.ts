import { describe, expect, it } from "vitest";
import {
  mapBenefitRow,
  mapConditionRow,
  mapLetterTemplateRow,
  mapProcedureRow,
} from "#client/mappers/catalog";
import { day, timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type ProcedureRow = Database["public"]["Tables"]["procedures"]["Row"];
type BenefitRow = Database["public"]["Tables"]["benefits"]["Row"];
type ConditionRow = Database["public"]["Tables"]["conditions"]["Row"];
type LetterTemplateRow = Database["public"]["Tables"]["letter_templates"]["Row"];

const procedureRow: ProcedureRow = {
  id: uuid(1),
  code: "DECL_DECES",
  title: "Déclarer le décès",
  description: "À faire en mairie.",
  organization: "Mairie",
  recipient_address: "1 rue de la Mairie",
  time_window: "24h",
  delay_days: 1,
  reference_profession: "notaire",
  source_url: "https://service-public.fr/deces",
  last_verified_date: day(1),
  active: true,
  created_at: timestamp(1),
  updated_at: timestamp(2),
};

const benefitRow: BenefitRow = {
  id: uuid(1),
  code: "CAPITAL_DECES",
  title: "Capital décès",
  main_condition: "Salarié affilié au régime général",
  estimated_amount: "3 738 €",
  organization: "CPAM",
  form_url: "https://ameli.fr/formulaire",
  caution_text: "Des personnes dans une situation comme la vôtre peuvent y avoir droit.",
  time_window: "30d",
  source_url: "https://ameli.fr/capital-deces",
  last_verified_date: day(2),
  active: true,
  created_at: timestamp(3),
  updated_at: timestamp(4),
};

const conditionRow: ConditionRow = {
  id: uuid(1),
  procedure_id: uuid(2),
  benefit_id: null,
  expression: { type: "comparison", field: "mode", operator: "eq", value: "death" },
  created_at: timestamp(1),
  updated_at: timestamp(2),
};

const templateRow: LetterTemplateRow = {
  id: uuid(1),
  procedure_id: uuid(2),
  title: "Résiliation de contrat",
  body_template: "Madame, Monsieur, {{subjectLastName}}…",
  variables: ["subjectLastName"],
  source_url: "https://service-public.fr/modele",
  last_verified_date: day(1),
  created_at: timestamp(1),
  updated_at: timestamp(2),
};

describe("mapProcedureRow", () => {
  it("maps every column to its own field", () => {
    expect(mapProcedureRow(procedureRow)).toEqual({
      id: uuid(1),
      code: "DECL_DECES",
      title: "Déclarer le décès",
      description: "À faire en mairie.",
      organization: "Mairie",
      recipientAddress: "1 rue de la Mairie",
      timeWindow: "24h",
      delayDays: 1,
      referenceProfession: "notaire",
      sourceUrl: "https://service-public.fr/deces",
      lastVerifiedDate: day(1),
      active: true,
      createdAt: timestamp(1),
      updatedAt: timestamp(2),
    });
  });

  // Catalog entries are displayed with their provenance, and the screens take source_url and
  // last_verified_date as non-optional props: a row without them cannot be rendered honestly.
  it("rejects a catalog entry with no usable source", () => {
    expect(() => mapProcedureRow({ ...procedureRow, source_url: "pas-une-url" })).toThrow();
  });

  it("rejects a verification date that is not a calendar day", () => {
    expect(() => mapProcedureRow({ ...procedureRow, last_verified_date: timestamp(1) })).toThrow();
  });

  it("rejects a time window the engine cannot order", () => {
    expect(() => mapProcedureRow({ ...procedureRow, time_window: "1y" })).toThrow();
  });
});

describe("mapBenefitRow", () => {
  it("maps every column to its own field", () => {
    expect(mapBenefitRow(benefitRow)).toEqual({
      id: uuid(1),
      code: "CAPITAL_DECES",
      title: "Capital décès",
      mainCondition: "Salarié affilié au régime général",
      estimatedAmount: "3 738 €",
      organization: "CPAM",
      formUrl: "https://ameli.fr/formulaire",
      cautionText: "Des personnes dans une situation comme la vôtre peuvent y avoir droit.",
      timeWindow: "30d",
      sourceUrl: "https://ameli.fr/capital-deces",
      lastVerifiedDate: day(2),
      active: true,
      createdAt: timestamp(3),
      updatedAt: timestamp(4),
    });
  });

  // A benefit is shown with a caution about entitlement; an empty one would leave the screen
  // asserting a right rather than a possibility.
  it("rejects a benefit with no caution text", () => {
    expect(() => mapBenefitRow({ ...benefitRow, caution_text: "" })).toThrow();
  });

  it("accepts a benefit whose amount cannot be estimated", () => {
    expect(mapBenefitRow({ ...benefitRow, estimated_amount: null }).estimatedAmount).toBeNull();
  });
});

describe("mapConditionRow", () => {
  it("maps every column to its own field", () => {
    expect(mapConditionRow(conditionRow)).toEqual({
      id: uuid(1),
      procedureId: uuid(2),
      benefitId: null,
      expression: { type: "comparison", field: "mode", operator: "eq", value: "death" },
      createdAt: timestamp(1),
    });
  });

  it("carries a nested boolean expression the engine can walk", () => {
    const nested = {
      type: "and",
      conditions: [
        { type: "comparison", field: "mode", operator: "eq", value: "death" },
        { type: "not", condition: { type: "comparison", field: "kids", operator: "eq", value: 0 } },
      ],
    };

    expect(mapConditionRow({ ...conditionRow, expression: nested }).expression).toEqual(nested);
  });

  it("rejects an operator the evaluator does not implement", () => {
    const unknown = { type: "comparison", field: "mode", operator: "matches", value: "death" };

    expect(() => mapConditionRow({ ...conditionRow, expression: unknown })).toThrow();
  });
});

describe("mapLetterTemplateRow", () => {
  it("maps every column to its own field", () => {
    expect(mapLetterTemplateRow(templateRow)).toEqual({
      id: uuid(1),
      procedureId: uuid(2),
      title: "Résiliation de contrat",
      bodyTemplate: "Madame, Monsieur, {{subjectLastName}}…",
      variables: ["subjectLastName"],
      sourceUrl: "https://service-public.fr/modele",
      lastVerifiedDate: day(1),
      createdAt: timestamp(1),
      updatedAt: timestamp(2),
    });
  });

  it("accepts a template with no external source", () => {
    expect(mapLetterTemplateRow({ ...templateRow, source_url: null }).sourceUrl).toBeNull();
  });

  it("rejects a variables column that is not a list of names", () => {
    expect(() => mapLetterTemplateRow({ ...templateRow, variables: { a: 1 } })).toThrow();
  });
});
