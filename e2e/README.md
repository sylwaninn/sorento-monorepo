# @sorento/e2e

End-to-end journeys with Playwright, **against the real stack**: the production-built app in a real browser, a local Supabase with real RLS and real Edge Functions. Nothing is mocked. These tests exist for the failure no other suite can see: a screen, a policy and a function disagreeing about what a user may do.

Conventions baked into the config:

- Tests match `tests/*.e2e.ts` and run fully parallel: every journey creates its own users and its own dossier, so they never contend for state.
- The app is served from a production build, not the dev server. A journey that only works with hot reload is not the journey users get.
- Served on `http://localhost:5273`, a port and a host of its own. Playwright reuses a server it finds already running, so sharing 5173 with `pnpm dev` would let the suite silently test the dev server; and `supabase/config.toml` declares its redirect allow-list on this exact origin, so a link out of an email is only followable from here.
- Locale pinned to `fr-FR` / `Europe/Paris` so segmented date fields mean the same thing everywhere.
- No retries locally (a journey that passes on the second attempt is flaky and should be visible as such); one retry in CI with traces and screenshots kept on failure.

## Running

```bash
supabase start                        # local stack must be up
pnpm test:e2e                         # from the root, or:
pnpm --filter @sorento/e2e test:e2e:ui  # Playwright UI mode
```

## `support/`

Split by what each module is allowed to touch, and the boundary between them is the point.

`copy.ts` and the per-area `copy-<area>.ts` modules hold every French string a journey clicks on. The suite is a black box, so it imports none of the app's packages and these strings are copies of the per-feature content dictionaries rather than references to them. Each one is declared through `mirrors(...)` (`mirrors.ts`), naming the dictionary it came from, and `pnpm check:tests` refuses one whose dictionary no longer contains that text: a rewording then fails in milliseconds, before the commit, naming both sides. It does not fail as a selector finding nothing, minutes into CI, pointing at the test. `copy.ts` carries what the shared helpers drive the app through; copy belonging to one area lives beside that area's journey, so two journeys never queue behind the same file.

`app.ts` drives the browser. Everything a user does goes through here, including creating a dossier, which is why there is no service_role shortcut for it: a fixture that created one directly would test the fixture. `account-setup.ts` and `workspace-setup.ts` add what a single area needs on top of it, for the same reason.

`mailbox.ts` reads what the stack actually sent, from Mailpit. Signing up, resetting a password and asking for a magic link all end with a person leaving the browser, and a journey stopping at "the screen said an email was sent" proves the screen rather than the flow: the half it skips is where the link is built, where the token is minted and where the redirect has to be on the allow-list.

`backend.ts` covers what a browser cannot reach, and only that: the passage of time, a token no local email carries, an already-confirmed account for the areas whose subject is not signing up, and the reads a journey cannot make on screen. Note what it deliberately does not do. Reporting a death plants the activation token on the designation and then spends it against the real endpoint, rather than writing the columns that endpoint would have written. The grace period, the freeze the scheduled job later reads and the notification every member gets are decided by the function, so they are stated once. It also means `request-dossier-activation` is exercised on its happy path here and nowhere else.

`env.ts` holds the three origins the suite talks to: the app's, the stack's and the mailbox's.
