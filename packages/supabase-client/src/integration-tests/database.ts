import { Client } from "pg";
import { LOCAL_DATABASE_URL } from "#client/integration-tests/env";

/**
 * Opens a connection, runs one query, closes it. The catalog suites make a handful of queries
 * in total, so a pool would be machinery for nothing, and a leaked pooled connection is a hung
 * CI job, which costs far more than reconnecting.
 */
export const query = async <T extends Record<string, unknown>>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T[]> => {
  const client = new Client({ connectionString: LOCAL_DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<T>(sql, [...params]);
    return result.rows;
  } finally {
    await client.end();
  }
};

/**
 * Reads back the values a `check (col in (...))` constraint allows, in declaration order.
 * The constraint definition is the only place the allowed set exists once the migration has
 * run, so a test comparing a TypeScript enum against a hand-copied list would only be
 * comparing two copies of the same assumption.
 */
export const allowedValues = async (table: string, column: string): Promise<string[]> => {
  const rows = await query<{ definition: string }>(
    `select pg_get_constraintdef(c.oid) as definition
       from pg_constraint c
       join pg_class t on t.oid = c.conrelid
       join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = $1 and c.contype = 'c'
        and pg_get_constraintdef(c.oid) like '%' || $2 || '%'`,
    [table, column],
  );

  const definitions = rows.map((row) => row.definition).filter((d) => d.includes("ANY (ARRAY["));
  if (definitions.length !== 1) {
    throw new Error(
      `expected exactly one IN-list check on ${table}.${column}, found ${definitions.length}`,
    );
  }

  const list = definitions[0] ?? "";
  return [...list.matchAll(/'([^']*)'::/g)].map((match) => match[1] ?? "");
};
