# @sorento/e2e

End-to-end journeys with Playwright, **against the real stack**: the production-built app in a real browser, a local Supabase with real RLS and real Edge Functions. Nothing is mocked. These tests exist for the failure no other suite can see: a screen, a policy and a function disagreeing about what a user may do.

Conventions baked into the config:

- Tests match `tests/*.e2e.ts` and run fully parallel: every journey creates its own users and its own dossier, so they never contend for state.
- The app is served from a production build, not the dev server. A journey that only works with hot reload is not the journey users get.
- Locale pinned to `fr-FR` / `Europe/Paris` so segmented date fields mean the same thing everywhere.
- No retries locally (a journey that passes on the second attempt is flaky and should be visible as such); one retry in CI with traces and screenshots kept on failure.

## Running

```bash
supabase start                        # local stack must be up
pnpm test:e2e                         # from the root, or:
pnpm --filter @sorento/e2e test:e2e:ui  # Playwright UI mode
```

## `support/`

Three modules, and the boundary between them is the point.

`copy.ts` holds every French string a journey clicks on. The suite is a black box, so it imports none of the app's packages and these strings are copies of the per-feature content dictionaries rather than references to them. Each entry names the dictionary it came from, and `pnpm check:tests` refuses one whose dictionary no longer contains that text: a rewording then fails in milliseconds, before the commit, naming both sides. It does not fail as a selector finding nothing, minutes into CI, pointing at the test.

`app.ts` drives the browser. Everything a user does goes through here, including creating a dossier, which is why there is no service_role shortcut for it: a fixture that created one directly would test the fixture.

`backend.ts` covers the three things a browser cannot reach, and only those: a confirmation email, a token that only exists inside one, and the passage of time. Note what it deliberately does not do. Reporting a death plants the activation token on the designation and then spends it against the real endpoint, rather than writing the columns that endpoint would have written. The grace period, the freeze the scheduled job later reads and the notification every member gets are decided by the function, so they are stated once. It also means `request-dossier-activation` is exercised on its happy path here and nowhere else.
