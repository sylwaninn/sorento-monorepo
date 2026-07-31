# Registry manifest

Every file in this directory is declared here with where it came from and how it deviates from
its upstream. `pnpm check:styles` compares this table against the directory in both directions:
a file this table does not name fails the build, and so does a row naming a file that is gone.
The point is that nothing enters the registry silently: a component arrives through the CLI (or
is declared here as ours), and an edit to an upstream file is a deviation someone wrote down.

To update the upstream components, run `npx shadcn@latest diff` (network required), review what
upstream changed, then re-add with `npx shadcn@latest add <name> -o` and re-apply the deviations
listed here. The skiper-ui files are re-fetched from their registry URL in `components.json`.

| File                     | Source    | Deviations from upstream                                                        |
| ------------------------ | --------- | ------------------------------------------------------------------------------- |
| `accordion.tsx`          | shadcn    | `indicator` prop on the trigger, so a surface can swap the glyph.               |
| `alert-dialog.tsx`       | shadcn    | None: themed through the tokens only.                                           |
| `alert.tsx`              | shadcn    | Variant-aware `AlertIndicator` deriving its icon; accent/success/warning tones. |
| `avatar.tsx`             | shadcn    | None: themed through the tokens only.                                           |
| `badge.tsx`              | shadcn    | Status tones (accent/success/warning) shared with the alerts.                   |
| `button-animated.tsx`    | ours      | Navigating twin of Button: arrow badge, RouteAnchor destination.                |
| `button.tsx`             | shadcn    | `pending` prop; public pill/pill-light/quiet tones and pill size.               |
| `card.tsx`               | shadcn    | `CardTitle` is a real heading with `asChild`.                                   |
| `checkbox.tsx`           | shadcn    | None: themed through the tokens only.                                           |
| `dropdown-menu.tsx`      | shadcn    | None: themed through the tokens only.                                           |
| `field.tsx`              | shadcn    | None: themed through the tokens only.                                           |
| `input.tsx`              | shadcn    | None: themed through the tokens only.                                           |
| `label.tsx`              | shadcn    | None: themed through the tokens only.                                           |
| `link.tsx`               | ours      | The one anchor of the app, `asChild` for the router.                            |
| `progress-circle.tsx`    | ours      | Ring progress for compact rows; native svg progressbar.                         |
| `progress.tsx`           | shadcn    | None: themed through the tokens only.                                           |
| `radio-group.tsx`        | shadcn    | None: themed through the tokens only.                                           |
| `select.tsx`             | shadcn    | None: themed through the tokens only.                                           |
| `separator.tsx`          | shadcn    | None: themed through the tokens only.                                           |
| `shell.ts`               | ours      | The public page measures, as class strings.                                     |
| `skiper-ui/skiper41.tsx` | skiper-ui | `tint` prop splitting the veil colour from the mask; token default colour.      |
| `skiper-ui/skiper99.tsx` | skiper-ui | `direction` prop; hover driven by the caller's group; scaled to size-4.         |
| `spinner.tsx`            | shadcn    | Decorative on purpose: upstream's English `role="status"` label dropped.        |
| `switch.tsx`             | shadcn    | None: themed through the tokens only.                                           |
| `tabs.tsx`               | shadcn    | None: themed through the tokens only.                                           |
| `textarea.tsx`           | shadcn    | None: themed through the tokens only.                                           |
| `typography.tsx`         | ours      | Heading/Text primitives carrying the app and display type scales.               |
