# @sorento/supabase-client

Data access for the web app: **repositories** (one per aggregate) and **mappers** (database row ↔ domain object, both directions validated against `@sorento/domain` schemas).

This is **the only package allowed to import `@supabase/supabase-js`**. The ESLint boundaries reject the import anywhere else, so every query, every RPC and every storage call funnels through here.

## Structure

```
src/
├── repositories/        # One repository per aggregate, returning domain objects
├── mappers/             # Row <-> domain translation, each with a sibling test
└── integration-tests/   # RLS, hardening, policy snapshot, SQL mirrors, Edge Functions
```

## Testing

Two distinct suites:

- **Unit** (`pnpm --filter @sorento/supabase-client test`): mappers and repository logic, no network.
- **Integration** (`pnpm test:integration`, from the root): runs against the real local Postgres: RLS policy behaviour per role, hardening checks, the policy snapshot (a new policy changes the snapshot, and that diff must be accepted deliberately), the SQL↔TypeScript mirror suite, and HTTP tests for every Edge Function. Requires `supabase start`.

Every new RLS policy arrives with its integration test; the suite here is where that rule is enforced.
