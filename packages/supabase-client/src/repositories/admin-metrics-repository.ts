import type { AdminMetricsPort } from "@sorento/domain";
import { adminMetricsSchema, type AdminMetrics } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, SupabaseRepositoryError } from "#client/errors";

// get_admin_metrics() is security definer and checks is_admin() itself: it returns
// anonymized aggregate counts only, never dossier-level or user-level content.
export class AdminMetricsRepository implements AdminMetricsPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  get = async (): Promise<AdminMetrics> => {
    const { data, error } = await this.client.rpc("get_admin_metrics");
    assertNoError(error, "get admin metrics");
    if (!data) throw new SupabaseRepositoryError("get admin metrics: no data returned", null);
    return adminMetricsSchema.parse(data);
  };
}
