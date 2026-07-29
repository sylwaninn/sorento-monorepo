import {
  benefitSchema,
  conditionSchema,
  procedureSchema,
  letterTemplateSchema,
  type Benefit,
  type Condition,
  type Procedure,
  type LetterTemplate,
} from "@sorento/domain";
import type { Database } from "#client/database.types";

type ProcedureRow = Database["public"]["Tables"]["procedures"]["Row"];
type BenefitRow = Database["public"]["Tables"]["benefits"]["Row"];
type ConditionRow = Database["public"]["Tables"]["conditions"]["Row"];
type LetterTemplateRow = Database["public"]["Tables"]["letter_templates"]["Row"];

export const mapProcedureRow = (row: ProcedureRow): Procedure =>
  procedureSchema.parse({
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    organization: row.organization,
    recipientAddress: row.recipient_address,
    timeWindow: row.time_window,
    delayDays: row.delay_days,
    referenceProfession: row.reference_profession,
    sourceUrl: row.source_url,
    lastVerifiedDate: row.last_verified_date,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export const mapBenefitRow = (row: BenefitRow): Benefit =>
  benefitSchema.parse({
    id: row.id,
    code: row.code,
    title: row.title,
    mainCondition: row.main_condition,
    estimatedAmount: row.estimated_amount,
    organization: row.organization,
    formUrl: row.form_url,
    cautionText: row.caution_text,
    timeWindow: row.time_window,
    sourceUrl: row.source_url,
    lastVerifiedDate: row.last_verified_date,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export const mapConditionRow = (row: ConditionRow): Condition =>
  conditionSchema.parse({
    id: row.id,
    procedureId: row.procedure_id,
    benefitId: row.benefit_id,
    expression: row.expression,
    createdAt: row.created_at,
  });

export const mapLetterTemplateRow = (row: LetterTemplateRow): LetterTemplate =>
  letterTemplateSchema.parse({
    id: row.id,
    procedureId: row.procedure_id,
    title: row.title,
    bodyTemplate: row.body_template,
    variables: row.variables,
    sourceUrl: row.source_url,
    lastVerifiedDate: row.last_verified_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
