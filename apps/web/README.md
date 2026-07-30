# @sorento/web

React SPA: the **assembly layer** of the monorepo. It composes `@sorento/domain`, `@sorento/core` and `@sorento/supabase-client` into screens. A React component here never contains a business rule: no eligibility condition, no deadline computation. Those live in `packages/core`, and the ESLint boundaries fail the build if this layer reaches where it should not.

## Stack

React 19 · Vite · React Router 7 · TanStack Query 5 · shadcn/ui on Radix · Tailwind CSS v4, driven entirely by the tokens in `src/index.css`.

## Structure

```
src/
├── auth/          # Session handling and guards
├── components/    # Shared presentational components, with ui/ holding the shadcn registry
├── features/      # One directory per feature: account, activation, admin, auth,
│                  # content, diagnostic, dossier(s), landing, legal, notifications
├── hooks/         # Shared hooks
├── layout/        # App shell
├── lib/           # Framework glue (query client, supabase wiring, helpers)
├── index.css      # The only authored stylesheet: @theme tokens and the base layer
├── navigation.ts  # Public URLs and homepage anchors
└── routes.tsx     # Route table
```

`components/ui/` is the shadcn registry, added through its CLI and kept close to upstream: the
theme is what makes it ours. Where a component gained an API the whole app needs (a `pending`
button, an `asChild` card title, an alert that derives its own icon), the reason sits in a
comment beside it.

## Rules that bite here

- **shadcn/ui components only.** Composing them is encouraged; reimplementing one is forbidden. Check every prop against the shadcn docs (MCP) and add components with the CLI, never by hand. A hand-drawn equivalent of something the registry ships (a dialog, a disclosure) is the bug, even when it looks right.
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
