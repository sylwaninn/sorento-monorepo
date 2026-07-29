import type {
  Benefit,
  BenefitInput,
  CatalogPort,
  Condition,
  ConditionInput,
  LetterTemplate,
  LetterTemplateInput,
  Procedure,
  ProcedureInput,
} from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, requireRow } from "#client/errors";
import {
  mapBenefitRow,
  mapConditionRow,
  mapLetterTemplateRow,
  mapProcedureRow,
} from "#client/mappers";

// Reads are anon-accessible (the public diagnostic needs them). Writes are RLS-gated to
// is_admin() and reserved for the admin backoffice.
export class CatalogRepository implements CatalogPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listProcedures = async (): Promise<Procedure[]> => {
    const { data, error } = await this.client.from("procedures").select().eq("active", true);
    assertNoError(error, "list catalog procedures");
    return (data ?? []).map(mapProcedureRow);
  };

  listAllProcedures = async (): Promise<Procedure[]> => {
    const { data, error } = await this.client
      .from("procedures")
      .select()
      .order("title", { ascending: true });
    assertNoError(error, "list all catalog procedures");
    return (data ?? []).map(mapProcedureRow);
  };

  createProcedure = async (input: ProcedureInput): Promise<Procedure> => {
    const { data, error } = await this.client
      .from("procedures")
      .insert({
        code: input.code,
        title: input.title,
        description: input.description,
        organization: input.organization,
        recipient_address: input.recipientAddress,
        time_window: input.timeWindow,
        delay_days: input.delayDays,
        reference_profession: input.referenceProfession,
        source_url: input.sourceUrl,
        last_verified_date: input.lastVerifiedDate,
        active: input.active,
      })
      .select()
      .single();

    return mapProcedureRow(requireRow(data, error, "create procedure"));
  };

  updateProcedure = async (id: string, input: ProcedureInput): Promise<Procedure> => {
    const { data, error } = await this.client
      .from("procedures")
      .update({
        code: input.code,
        title: input.title,
        description: input.description,
        organization: input.organization,
        recipient_address: input.recipientAddress,
        time_window: input.timeWindow,
        delay_days: input.delayDays,
        reference_profession: input.referenceProfession,
        source_url: input.sourceUrl,
        last_verified_date: input.lastVerifiedDate,
        active: input.active,
      })
      .eq("id", id)
      .select()
      .single();

    return mapProcedureRow(requireRow(data, error, "update procedure"));
  };

  deleteProcedure = async (id: string): Promise<void> => {
    const { error } = await this.client.from("procedures").delete().eq("id", id);
    assertNoError(error, "delete procedure");
  };

  listBenefits = async (): Promise<Benefit[]> => {
    const { data, error } = await this.client.from("benefits").select().eq("active", true);
    assertNoError(error, "list catalog benefits");
    return (data ?? []).map(mapBenefitRow);
  };

  listAllBenefits = async (): Promise<Benefit[]> => {
    const { data, error } = await this.client
      .from("benefits")
      .select()
      .order("title", { ascending: true });
    assertNoError(error, "list all catalog benefits");
    return (data ?? []).map(mapBenefitRow);
  };

  createBenefit = async (input: BenefitInput): Promise<Benefit> => {
    const { data, error } = await this.client
      .from("benefits")
      .insert({
        code: input.code,
        title: input.title,
        main_condition: input.mainCondition,
        estimated_amount: input.estimatedAmount,
        organization: input.organization,
        form_url: input.formUrl,
        caution_text: input.cautionText,
        time_window: input.timeWindow,
        source_url: input.sourceUrl,
        last_verified_date: input.lastVerifiedDate,
        active: input.active,
      })
      .select()
      .single();

    return mapBenefitRow(requireRow(data, error, "create benefit"));
  };

  updateBenefit = async (id: string, input: BenefitInput): Promise<Benefit> => {
    const { data, error } = await this.client
      .from("benefits")
      .update({
        code: input.code,
        title: input.title,
        main_condition: input.mainCondition,
        estimated_amount: input.estimatedAmount,
        organization: input.organization,
        form_url: input.formUrl,
        caution_text: input.cautionText,
        time_window: input.timeWindow,
        source_url: input.sourceUrl,
        last_verified_date: input.lastVerifiedDate,
        active: input.active,
      })
      .eq("id", id)
      .select()
      .single();

    return mapBenefitRow(requireRow(data, error, "update benefit"));
  };

  deleteBenefit = async (id: string): Promise<void> => {
    const { error } = await this.client.from("benefits").delete().eq("id", id);
    assertNoError(error, "delete benefit");
  };

  listConditions = async (): Promise<Condition[]> => {
    const { data, error } = await this.client.from("conditions").select();
    assertNoError(error, "list catalog conditions");
    return (data ?? []).map(mapConditionRow);
  };

  createCondition = async (input: ConditionInput): Promise<Condition> => {
    const { data, error } = await this.client
      .from("conditions")
      .insert({
        procedure_id: input.procedureId,
        benefit_id: input.benefitId,
        expression: input.expression,
      })
      .select()
      .single();

    return mapConditionRow(requireRow(data, error, "create condition"));
  };

  updateCondition = async (id: string, input: ConditionInput): Promise<Condition> => {
    const { data, error } = await this.client
      .from("conditions")
      .update({
        procedure_id: input.procedureId,
        benefit_id: input.benefitId,
        expression: input.expression,
      })
      .eq("id", id)
      .select()
      .single();

    return mapConditionRow(requireRow(data, error, "update condition"));
  };

  deleteCondition = async (id: string): Promise<void> => {
    const { error } = await this.client.from("conditions").delete().eq("id", id);
    assertNoError(error, "delete condition");
  };

  listLetterTemplates = async (procedureId: string): Promise<LetterTemplate[]> => {
    const { data, error } = await this.client
      .from("letter_templates")
      .select()
      .eq("procedure_id", procedureId);
    assertNoError(error, "list letter templates");
    return (data ?? []).map(mapLetterTemplateRow);
  };

  listAllLetterTemplates = async (): Promise<LetterTemplate[]> => {
    const { data, error } = await this.client
      .from("letter_templates")
      .select()
      .order("title", { ascending: true });
    assertNoError(error, "list all letter templates");
    return (data ?? []).map(mapLetterTemplateRow);
  };

  createLetterTemplate = async (input: LetterTemplateInput): Promise<LetterTemplate> => {
    const { data, error } = await this.client
      .from("letter_templates")
      .insert({
        procedure_id: input.procedureId,
        title: input.title,
        body_template: input.bodyTemplate,
        variables: input.variables,
        source_url: input.sourceUrl,
        last_verified_date: input.lastVerifiedDate,
      })
      .select()
      .single();

    return mapLetterTemplateRow(requireRow(data, error, "create letter template"));
  };

  updateLetterTemplate = async (
    id: string,
    input: LetterTemplateInput,
  ): Promise<LetterTemplate> => {
    const { data, error } = await this.client
      .from("letter_templates")
      .update({
        procedure_id: input.procedureId,
        title: input.title,
        body_template: input.bodyTemplate,
        variables: input.variables,
        source_url: input.sourceUrl,
        last_verified_date: input.lastVerifiedDate,
      })
      .eq("id", id)
      .select()
      .single();

    return mapLetterTemplateRow(requireRow(data, error, "update letter template"));
  };

  deleteLetterTemplate = async (id: string): Promise<void> => {
    const { error } = await this.client.from("letter_templates").delete().eq("id", id);
    assertNoError(error, "delete letter template");
  };
}
