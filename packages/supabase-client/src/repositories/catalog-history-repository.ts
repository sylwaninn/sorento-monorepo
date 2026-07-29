import type { CatalogHistory, CatalogHistoryPort } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError } from "#client/errors";
import { mapCatalogHistoryRow } from "#client/mappers";

export class CatalogHistoryRepository implements CatalogHistoryPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listRecent = async (limit = 100): Promise<CatalogHistory[]> => {
    const { data, error } = await this.client
      .from("catalog_history")
      .select()
      .order("created_at", { ascending: false })
      .limit(limit);

    assertNoError(error, "list catalog history");
    return (data ?? []).map(mapCatalogHistoryRow);
  };
}
