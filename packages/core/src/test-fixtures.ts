import type { Benefit, Condition, Procedure } from "@sorento/domain";

let counter = 0;
const fakeId = (): string => {
  counter += 1;
  return `00000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
};

export const createProcedure = (overrides: Partial<Procedure> = {}): Procedure => ({
  id: fakeId(),
  code: `procedure_${counter}`,
  title: "Test procedure",
  description: "Test description",
  organization: "Test organization",
  recipientAddress: null,
  timeWindow: "7d",
  delayDays: null,
  referenceProfession: null,
  sourceUrl: "https://example.com",
  lastVerifiedDate: "2026-01-01",
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

export const createBenefit = (overrides: Partial<Benefit> = {}): Benefit => ({
  id: fakeId(),
  code: `benefit_${counter}`,
  title: "Test benefit",
  mainCondition: "Test condition",
  estimatedAmount: null,
  organization: "Test organization",
  formUrl: "https://example.com/form",
  cautionText: "People in a situation like yours may be entitled to this benefit.",
  timeWindow: "30d",
  sourceUrl: "https://example.com",
  lastVerifiedDate: "2026-01-01",
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

export const createCondition = (overrides: Partial<Condition> = {}): Condition => ({
  id: fakeId(),
  procedureId: null,
  benefitId: null,
  expression: { type: "comparison", field: "testField", operator: "eq", value: true },
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});
