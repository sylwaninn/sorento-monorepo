# @sorento/e2e

End-to-end journeys with Playwright, **against the real stack**: the production-built app in a real browser, a local Supabase with real RLS and real Edge Functions. Nothing is mocked — these tests exist for the failure no other suite can see: a screen, a policy and a function disagreeing about what a user may do.

Conventions baked into the config:

- Tests match `tests/*.e2e.ts` and run fully parallel: every journey creates its own users and its own dossier, so they never contend for state.
- The app is served from a production build, not the dev server — a journey that only works with hot reload is not the journey users get.
- Locale pinned to `fr-FR` / `Europe/Paris` so segmented date fields mean the same thing everywhere.
- No retries locally (a journey that passes on the second attempt is flaky and should be visible as such); one retry in CI with traces and screenshots kept on failure.

## Running

```bash
supabase start                        # local stack must be up
pnpm test:e2e                         # from the root, or:
pnpm --filter @sorento/e2e test:e2e:ui  # Playwright UI mode
```

`support/` holds the environment wiring and shared fixtures.
