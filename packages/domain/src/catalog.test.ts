import { describe, expect, it } from "vitest";
import {
  benefitInputSchema,
  benefitSchema,
  conditionInputSchema,
  conditionSchema,
  letterTemplateInputSchema,
  letterTemplateSchema,
  procedureInputSchema,
  procedureSchema,
} from "#domain/catalog";
import { DATE, DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const EXPRESSION = { type: "comparison", field: "maritalStatus", operator: "eq", value: "married" };

const PROCEDURE = {
  id: ID,
  code: "declaration_deces",
  title: "Déclarer le décès",
  description: "À faire en mairie.",
  organization: "Mairie",
  recipientAddress: null,
  timeWindow: "24h",
  delayDays: 1,
  referenceProfession: null,
  sourceUrl: "https://service-public.fr/procedure",
  lastVerifiedDate: DATE,
  active: true,
  createdAt: DATE_TIME,
  updatedAt: DATE_TIME,
};

const BENEFIT = {
  id: ID,
  code: "capital_deces",
  title: "Capital décès",
  mainCondition: "Le défunt était salarié.",
  estimatedAmount: null,
  organization: "CPAM",
  formUrl: "https://ameli.fr/formulaire",
  cautionText: "Les personnes dans une situation comme la vôtre peuvent y avoir droit.",
  timeWindow: "30d",
  sourceUrl: "https://ameli.fr/source",
  lastVerifiedDate: DATE,
  active: true,
  createdAt: DATE_TIME,
  updatedAt: DATE_TIME,
};

const LETTER_TEMPLATE = {
  id: ID,
  procedureId: OTHER_ID,
  title: "Courrier de résiliation",
  bodyTemplate: "Madame, Monsieur, {{nom}}",
  variables: ["nom"],
  sourceUrl: null,
  lastVerifiedDate: DATE,
  createdAt: DATE_TIME,
  updatedAt: DATE_TIME,
};

/** What the catalog admin submits: the row minus the columns the database owns. */
const SERVER_OWNED = ["id", "createdAt", "updatedAt"];

const withoutServerOwned = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !SERVER_OWNED.includes(key)));

describe("procedureSchema", () => {
  it("accepts a complete procedure", () => {
    expect(procedureSchema.safeParse(PROCEDURE).success).toBe(true);
  });

  it.each([
    "id",
    "code",
    "title",
    "description",
    "organization",
    "timeWindow",
    "sourceUrl",
    "lastVerifiedDate",
    "active",
    "createdAt",
    "updatedAt",
  ])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = PROCEDURE as Record<string, unknown>;
    expect(procedureSchema.safeParse(withoutField).success).toBe(false);
  });

  it.each(["code", "title", "description", "organization"])("rejects an empty %s", (field) => {
    expect(procedureSchema.safeParse({ ...PROCEDURE, [field]: "" }).success).toBe(false);
  });

  // Every screen showing catalog data has to display where it comes from and when it was
  // last checked, so neither can be a free-form string nor absent.
  it("rejects a source that is not a URL", () => {
    expect(procedureSchema.safeParse({ ...PROCEDURE, sourceUrl: "service-public" }).success).toBe(
      false,
    );
  });

  it("rejects a verification date carrying a time", () => {
    expect(procedureSchema.safeParse({ ...PROCEDURE, lastVerifiedDate: DATE_TIME }).success).toBe(
      false,
    );
  });

  it("accepts a procedure with no postal recipient", () => {
    expect(procedureSchema.safeParse({ ...PROCEDURE, recipientAddress: null }).success).toBe(true);
  });

  it("accepts a procedure whose delay falls back to its time window", () => {
    expect(procedureSchema.safeParse({ ...PROCEDURE, delayDays: null }).success).toBe(true);
  });

  it("rejects a fractional delay in days", () => {
    expect(procedureSchema.safeParse({ ...PROCEDURE, delayDays: 1.5 }).success).toBe(false);
  });

  it("rejects a time window with no default delay behind it", () => {
    expect(procedureSchema.safeParse({ ...PROCEDURE, timeWindow: "1y" }).success).toBe(false);
  });

  it("rejects an id that is not a uuid", () => {
    expect(procedureSchema.safeParse({ ...PROCEDURE, id: NOT_AN_ID }).success).toBe(false);
  });
});

describe("procedureInputSchema", () => {
  it("accepts a procedure without the columns the database owns", () => {
    expect(procedureInputSchema.safeParse(withoutServerOwned(PROCEDURE)).success).toBe(true);
  });

  it.each(SERVER_OWNED)("does not accept %s from the client", (field) => {
    expect(Object.keys(procedureInputSchema.shape)).not.toContain(field);
  });

  it("still enforces every editable rule", () => {
    expect(
      procedureInputSchema.safeParse({ ...withoutServerOwned(PROCEDURE), title: "" }).success,
    ).toBe(false);
  });
});

describe("benefitSchema", () => {
  it("accepts a complete benefit", () => {
    expect(benefitSchema.safeParse(BENEFIT).success).toBe(true);
  });

  it.each([
    "id",
    "code",
    "title",
    "mainCondition",
    "organization",
    "formUrl",
    "cautionText",
    "timeWindow",
    "sourceUrl",
    "lastVerifiedDate",
    "active",
    "createdAt",
    "updatedAt",
  ])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = BENEFIT as Record<string, unknown>;
    expect(benefitSchema.safeParse(withoutField).success).toBe(false);
  });

  it.each(["code", "title", "mainCondition", "organization"])("rejects an empty %s", (field) => {
    expect(benefitSchema.safeParse({ ...BENEFIT, [field]: "" }).success).toBe(false);
  });

  // The prudent wording is mandatory on a benefit: the app never states an entitlement.
  it("rejects a benefit with no caution text", () => {
    expect(benefitSchema.safeParse({ ...BENEFIT, cautionText: "" }).success).toBe(false);
  });

  it("accepts a benefit whose amount cannot be estimated", () => {
    expect(benefitSchema.safeParse({ ...BENEFIT, estimatedAmount: null }).success).toBe(true);
  });

  it.each(["formUrl", "sourceUrl"])("rejects a %s that is not a URL", (field) => {
    expect(benefitSchema.safeParse({ ...BENEFIT, [field]: "ameli" }).success).toBe(false);
  });
});

describe("benefitInputSchema", () => {
  it("accepts a benefit without the columns the database owns", () => {
    expect(benefitInputSchema.safeParse(withoutServerOwned(BENEFIT)).success).toBe(true);
  });

  it.each(SERVER_OWNED)("does not accept %s from the client", (field) => {
    expect(Object.keys(benefitInputSchema.shape)).not.toContain(field);
  });

  it("still requires the caution text", () => {
    expect(
      benefitInputSchema.safeParse({ ...withoutServerOwned(BENEFIT), cautionText: "" }).success,
    ).toBe(false);
  });
});

describe("conditionSchema", () => {
  const CONDITION = {
    id: ID,
    procedureId: OTHER_ID,
    benefitId: null,
    expression: EXPRESSION,
    createdAt: DATE_TIME,
  };

  it("accepts a complete condition", () => {
    expect(conditionSchema.safeParse(CONDITION).success).toBe(true);
  });

  it.each(["id", "expression", "createdAt"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = CONDITION as Record<string, unknown>;
    expect(conditionSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects an expression the engine could not evaluate", () => {
    expect(conditionSchema.safeParse({ ...CONDITION, expression: { type: "xor" } }).success).toBe(
      false,
    );
  });
});

describe("conditionInputSchema", () => {
  it("accepts a condition targeting only a procedure", () => {
    expect(
      conditionInputSchema.safeParse({
        procedureId: ID,
        benefitId: null,
        expression: EXPRESSION,
      }).success,
    ).toBe(true);
  });

  it("accepts a condition targeting only a benefit", () => {
    expect(
      conditionInputSchema.safeParse({
        procedureId: null,
        benefitId: OTHER_ID,
        expression: EXPRESSION,
      }).success,
    ).toBe(true);
  });

  it("rejects a condition targeting both, which would make eligibility ambiguous", () => {
    expect(
      conditionInputSchema.safeParse({
        procedureId: ID,
        benefitId: OTHER_ID,
        expression: EXPRESSION,
      }).success,
    ).toBe(false);
  });

  it("rejects a condition targeting neither, which nothing would ever evaluate", () => {
    expect(
      conditionInputSchema.safeParse({
        procedureId: null,
        benefitId: null,
        expression: EXPRESSION,
      }).success,
    ).toBe(false);
  });

  it("states the exclusive-or rule in the error", () => {
    const result = conditionInputSchema.safeParse({
      procedureId: ID,
      benefitId: OTHER_ID,
      expression: EXPRESSION,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "A condition targets exactly one of a procedure or a benefit.",
      );
    }
  });

  it("reports the failure on procedureId so the form can surface it", () => {
    const result = conditionInputSchema.safeParse({
      procedureId: ID,
      benefitId: OTHER_ID,
      expression: EXPRESSION,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["procedureId"]);
    }
  });

  it("requires the expression", () => {
    expect(conditionInputSchema.safeParse({ procedureId: ID, benefitId: null }).success).toBe(
      false,
    );
  });
});

describe("letterTemplateSchema", () => {
  it("accepts a complete template", () => {
    expect(letterTemplateSchema.safeParse(LETTER_TEMPLATE).success).toBe(true);
  });

  it.each([
    "id",
    "procedureId",
    "title",
    "bodyTemplate",
    "variables",
    "lastVerifiedDate",
    "createdAt",
    "updatedAt",
  ])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = LETTER_TEMPLATE as Record<string, unknown>;
    expect(letterTemplateSchema.safeParse(withoutField).success).toBe(false);
  });

  it.each(["title", "bodyTemplate"])("rejects an empty %s", (field) => {
    expect(letterTemplateSchema.safeParse({ ...LETTER_TEMPLATE, [field]: "" }).success).toBe(false);
  });

  it("accepts a template with no variable to fill in", () => {
    expect(letterTemplateSchema.safeParse({ ...LETTER_TEMPLATE, variables: [] }).success).toBe(
      true,
    );
  });

  it("rejects variables given as a bare string", () => {
    expect(letterTemplateSchema.safeParse({ ...LETTER_TEMPLATE, variables: "nom" }).success).toBe(
      false,
    );
  });

  // A template is attached to a procedure; unlike catalog rows its source may be absent.
  it("accepts a template with no source URL", () => {
    expect(letterTemplateSchema.safeParse({ ...LETTER_TEMPLATE, sourceUrl: null }).success).toBe(
      true,
    );
  });

  it("rejects a source that is not a URL", () => {
    expect(letterTemplateSchema.safeParse({ ...LETTER_TEMPLATE, sourceUrl: "nope" }).success).toBe(
      false,
    );
  });
});

describe("letterTemplateInputSchema", () => {
  it("accepts a template without the columns the database owns", () => {
    expect(letterTemplateInputSchema.safeParse(withoutServerOwned(LETTER_TEMPLATE)).success).toBe(
      true,
    );
  });

  it.each(SERVER_OWNED)("does not accept %s from the client", (field) => {
    expect(Object.keys(letterTemplateInputSchema.shape)).not.toContain(field);
  });

  it("still requires a body", () => {
    expect(
      letterTemplateInputSchema.safeParse({
        ...withoutServerOwned(LETTER_TEMPLATE),
        bodyTemplate: "",
      }).success,
    ).toBe(false);
  });
});
