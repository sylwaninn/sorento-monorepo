import type { Tracking, TrackingPort, TrackingUpdate } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, requireRow } from "#client/errors";
import { mapTrackingRow } from "#client/mappers";

const UNIQUE_VIOLATION = "23505";

export class TrackingRepository implements TrackingPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listForDossier = async (dossierId: string): Promise<Tracking[]> => {
    const { data, error } = await this.client.from("tracking").select().eq("dossier_id", dossierId);

    assertNoError(error, "list dossier tracking");
    return (data ?? []).map(mapTrackingRow);
  };

  createForProcedure = (dossierId: string, procedureId: string): Promise<Tracking> =>
    this.createOnce(dossierId, { procedure_id: procedureId }, "procedure_id", procedureId);

  // Used by E16's "add to my procedures" action.
  createForBenefit = (dossierId: string, benefitId: string): Promise<Tracking> =>
    this.createOnce(dossierId, { benefit_id: benefitId }, "benefit_id", benefitId);

  /**
   * Adding the same item twice is a double click, not an error. The uniqueness is enforced by
   * two partial indexes (a row targets a procedure or a benefit, never both), which PostgREST
   * cannot use as an upsert conflict target, so the duplicate is caught and the existing row
   * returned instead.
   */
  private createOnce = async (
    dossierId: string,
    payload: { procedure_id?: string; benefit_id?: string },
    column: "procedure_id" | "benefit_id",
    targetId: string,
  ): Promise<Tracking> => {
    const { data, error } = await this.client
      .from("tracking")
      .insert({ dossier_id: dossierId, ...payload })
      .select()
      .maybeSingle();

    if (!error && data) return mapTrackingRow(data);
    if (error && error.code !== UNIQUE_VIOLATION) {
      assertNoError(error, "create tracking entry");
    }

    const existing = await this.client
      .from("tracking")
      .select()
      .eq("dossier_id", dossierId)
      .eq(column, targetId)
      .maybeSingle();

    return mapTrackingRow(requireRow(existing.data, existing.error, "create tracking entry"));
  };

  update = async (id: string, patch: TrackingUpdate): Promise<Tracking> => {
    const { data, error } = await this.client
      .from("tracking")
      .update({
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.note !== undefined && { note: patch.note }),
        ...(patch.assignedTo !== undefined && { assigned_to: patch.assignedTo }),
      })
      .eq("id", id)
      .select()
      .single();

    return mapTrackingRow(requireRow(data, error, "update tracking entry"));
  };
}
