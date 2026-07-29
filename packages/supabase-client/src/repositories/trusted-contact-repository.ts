import type {
  DesignateTrustedContactInput,
  ResolveTrustedContactActivationResult,
  TrustedContactDesignation,
  TrustedContactPort,
} from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, assertNoFunctionError } from "#client/errors";
import { mapTrustedContactDesignationRow } from "#client/mappers";

export class TrustedContactRepository implements TrustedContactPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listForDossier = async (dossierId: string): Promise<TrustedContactDesignation[]> => {
    const { data, error } = await this.client
      .from("trusted_contact_designations")
      .select()
      .eq("dossier_id", dossierId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    assertNoError(error, "list trusted contact designations");
    return (data ?? []).map(mapTrustedContactDesignationRow);
  };

  revoke = async (id: string): Promise<void> => {
    const { error } = await this.client
      .from("trusted_contact_designations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    assertNoError(error, "revoke trusted contact designation");
  };

  designate = async (
    input: DesignateTrustedContactInput,
  ): Promise<{ designationId: string; consentUrl: string }> => {
    const { data, error } = await this.client.functions.invoke<{
      designationId: string;
      consentUrl: string;
    }>("designate-trusted-contact", {
      body: input,
    });
    await assertNoFunctionError(error, "designate trusted contact");
    if (!data) throw new Error("designate trusted contact: no data returned");
    return data;
  };

  consent = async (token: string): Promise<{ dossierId: string; activationUrl: string }> => {
    const { data, error } = await this.client.functions.invoke<{
      dossierId: string;
      activationUrl: string;
    }>("consent-trusted-contact", {
      body: { token },
    });
    await assertNoFunctionError(error, "consent to trusted contact designation");
    if (!data) throw new Error("consent to trusted contact designation: no data returned");
    return data;
  };

  resolveActivation = async (token: string): Promise<ResolveTrustedContactActivationResult> => {
    const { data, error } =
      await this.client.functions.invoke<ResolveTrustedContactActivationResult>(
        "resolve-trusted-contact-activation",
        { body: { token } },
      );
    await assertNoFunctionError(error, "resolve trusted contact activation");
    if (!data) throw new Error("resolve trusted contact activation: no data returned");
    return data;
  };

  requestActivation = async (
    token: string,
    deathDate: string,
    documentPath?: string,
  ): Promise<{ dossierId: string; effectiveAt: string }> => {
    const { data, error } = await this.client.functions.invoke<{
      dossierId: string;
      effectiveAt: string;
    }>("request-dossier-activation", { body: { token, deathDate, documentPath } });
    await assertNoFunctionError(error, "request dossier activation");
    if (!data) throw new Error("request dossier activation: no data returned");
    return data;
  };

  opposeActivation = async (dossierId: string, reason?: string): Promise<void> => {
    const { error } = await this.client.functions.invoke("oppose-dossier-activation", {
      body: { dossierId, reason },
    });
    await assertNoFunctionError(error, "oppose dossier activation");
  };
}
