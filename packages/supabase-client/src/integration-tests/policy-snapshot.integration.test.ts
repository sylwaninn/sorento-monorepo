import { describe, expect, it } from "vitest";
import { query } from "#client/integration-tests/database";

/**
 * A checked-in inventory of every RLS policy the migrations produce, read back from the live
 * catalog after they have all replayed.
 *
 * CLAUDE.md requires a new policy to arrive with its integration test, and permissions.ts to
 * stay an explicit mirror of the policies. Neither survives on discipline alone: a migration
 * that drops and recreates a policy with a looser USING clause is a two-line diff in a file
 * nobody re-reads, and the suites that exercise the happy paths keep passing.
 *
 * This makes that change impossible to land silently. The snapshot only records what the
 * database ended up with, so a policy added, widened, narrowed or deleted shows as a diff that
 * has to be accepted deliberately — and accepting it is the moment to write the test that
 * covers the new behaviour.
 *
 * Update with `pnpm test:integration -u` after reviewing the diff, never to make CI green.
 */

interface PolicyRow extends Record<string, unknown> {
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

const format = (policy: PolicyRow): string =>
  [
    `${policy.tablename} :: ${policy.policyname}`,
    `  command    ${policy.cmd} (${policy.permissive.toLowerCase()})`,
    `  roles      ${policy.roles}`,
    `  using      ${policy.qual ?? "-"}`,
    `  with check ${policy.with_check ?? "-"}`,
  ].join("\n");

describe("RLS policy inventory", () => {
  it("matches the reviewed snapshot", async () => {
    const policies = await query<PolicyRow>(
      `select tablename, policyname, permissive, roles::text as roles, cmd, qual, with_check
         from pg_policies
        where schemaname = 'public'
        order by tablename, policyname`,
    );

    await expect(policies.map(format).join("\n\n")).toMatchFileSnapshot(
      "./__snapshots__/rls-policies.txt",
    );
  });

  /**
   * A table with row level security on and no policy denies everything, which is safe but
   * silently breaks a feature. A table with policies and RLS off is the opposite, and is the one
   * that leaks. Both are configuration mistakes no application test would notice.
   */
  it("leaves no public table with row level security disabled", async () => {
    const unprotected = await query<{ relname: string }>(
      `select c.relname
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
        order by c.relname`,
    );

    expect(unprotected.map((row) => row.relname)).toEqual([]);
  });

  it("leaves no protected table without a single policy", async () => {
    const silent = await query<{ relname: string }>(
      `select c.relname
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
          and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
        order by c.relname`,
    );

    expect(silent.map((row) => row.relname)).toEqual([]);
  });

  /**
   * `security definer` runs with the owner's rights, so a function that does not pin its
   * search_path can be made to resolve a table name to something the caller controls.
   */
  it("pins the search_path on every security definer function", async () => {
    const unpinned = await query<{ proname: string }>(
      `select p.proname
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and not exists (
            select 1 from unnest(coalesce(p.proconfig, '{}')) as config
             where config like 'search_path=%'
          )
        order by p.proname`,
    );

    expect(unpinned.map((row) => row.proname)).toEqual([]);
  });
});
