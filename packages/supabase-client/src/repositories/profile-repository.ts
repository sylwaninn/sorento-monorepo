import type { Profile, ProfilePort, ProfileUpdate } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError, requireRow } from "#client/errors";
import { mapProfileRow } from "#client/mappers";

export class ProfileRepository implements ProfilePort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listByIds = async (ids: string[]): Promise<Profile[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await this.client.from("profiles").select().in("id", ids);
    assertNoError(error, "list profiles");
    return (data ?? []).map(mapProfileRow);
  };

  updateSelf = async (id: string, input: ProfileUpdate): Promise<Profile> => {
    const { data, error } = await this.client
      .from("profiles")
      .update({ ...(input.firstName !== undefined && { first_name: input.firstName }) })
      .eq("id", id)
      .select()
      .single();

    return mapProfileRow(requireRow(data, error, "update profile"));
  };
}
