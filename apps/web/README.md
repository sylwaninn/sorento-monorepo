# @sorento/web

React SPA: the **assembly layer** of the monorepo. It composes `@sorento/domain`, `@sorento/core` and `@sorento/supabase-client` into screens. A React component here never contains a business rule: no eligibility condition, no deadline computation. Those live in `packages/core`, and the ESLint boundaries fail the build if this layer reaches where it should not.

## Stack

React 19 · Vite · React Router 7 · TanStack Query 5 · HeroUI v3 · Tailwind CSS v4 (layout and spacing only, never to rebuild or restyle HeroUI internals).

## Structure

```
src/
├── auth/        # Session handling and guards
├── components/  # Shared presentational components (HeroUI compositions)
├── features/    # One directory per feature: account, activation, admin, auth,
│                # content, diagnostic, dossier(s), landing, legal, notifications
├── hooks/       # Shared hooks
├── layout/      # App shell
├── lib/         # Framework glue (query client, supabase wiring, helpers)
└── routes.tsx   # Route table
```

## Rules that bite here

- **HeroUI components only.** Composing them is encouraged; reimplementing one is forbidden. Check every prop against the HeroUI docs (MCP), never guess.
- **UI copy is French, code is English**: identifiers, files, comments, all of it.
- **Tone**: cautious wording about entitlements, referral to regulated professionals on inheritance screens, never guilt-inducing UI (no aggressive red, no overdue counters, at most 2-3 highlighted "to do now" items).
- **Catalog data** renders with `source_url`, `last_verified_date` and `caution_text` as non-optional props.
- Only `VITE_`-prefixed environment variables reach the browser. The `service_role` key never appears here, under any name.

## Commands

```bash
pnpm --filter @sorento/web dev       # Vite dev server
pnpm --filter @sorento/web build     # production build
pnpm --filter @sorento/web test      # unit tests (Vitest + Testing Library, jsdom)
```

Root-level `pnpm dev` / `pnpm verify` cover this package through Turborepo.
