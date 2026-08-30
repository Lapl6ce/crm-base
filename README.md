# CRM Base

A reusable CRM foundation, built to be **forked per client** rather than shipped
as-is. Read [`CONTEXT.md`](./CONTEXT.md) first — it is the contract every module
honors (data model, folder rules, design tokens).

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # also enforces the architecture rules below
npm run build
```

## The three rules that keep this forkable

1. **The data layer is swappable.** UI code talks to `DataProvider`
   (`src/data/repositories.ts`) and never to an adapter. The only file that
   names a concrete adapter is `src/main.tsx` — pointing this at a real backend
   is one import there.
2. **Modules are islands.** `src/modules/*` may import `@/data`, `@/components`,
   `@/lib`, `@/layout` — never each other. Cross-module data goes through the
   data layer; cross-module *history* goes through `ActivityEvent`.
3. **Demo Mode is deletable.** `src/demo/` (Phase 6) has exactly two touchpoints
   in core code: the sidebar badge slot and the Settings toggle.

All three are enforced by `no-restricted-imports` in `.eslintrc.cjs`, so a
violation fails `npm run lint` rather than quietly becoming load-bearing.

## Where things live

| Path | What it owns |
|---|---|
| `src/data/` | Entity types, repository contract, the mock adapter, `useResource`, `useListQuery` |
| `src/lib/` | Design tokens, formatting, `heat.ts` (the urgency function), RBAC |
| `src/components/` | Shared primitives: Button, Field, Table, Overlay, Toast, EmptyState |
| `src/layout/` | AppShell, Sidebar, Topbar, CommandBar, PageHeader |
| `src/modules/` | One folder per feature module |

Each module folder is the same five files: a list page, a detail page, a form,
a `use<Module>.ts` holding every read and write it performs, and a `<module>Meta.ts`
for wording and defaults that nothing outside the module has an opinion about.

## Status

| Phase | | |
|---|---|---|
| 1 | Scaffold — data layer, tokens, shell, primitives | ✅ |
| 2 | Contacts & Companies — list, detail, forms | ✅ |
| 3 | Deals Pipeline — dnd-kit board, stage config, deal detail | ✅ |
| 4 | Tasks + Notes/Timeline | ✅ |
| 5 | Dashboard & Reports — 4 stat tiles, 3 charts | ✅ |
| 6 | Roles + Settings + Demo Mode | ✅ |
| 7 | Polish — states, responsive, a11y | ✅ |

One open item from the a11y pass: white text on coral is 3.28:1, under the
4.5:1 that 14px button labels need. Fixing it means darkening the brand colour,
so it is written up in [`CONTEXT.md`](./CONTEXT.md) §4 as a decision for the
fork rather than changed silently.

A fresh clone opens on empty states. The fastest way to see the app with
something in it is **Settings → Demo Mode → Load demo data**, which generates a
book of business with a live pipeline, overdue tasks and a quarter of history
behind it. `src/demo/` is deleted before client handoff — see
[`src/demo/README.md`](./src/demo/README.md).

On the pipeline board, a card is dragged with the mouse (after ~6px), with a
200ms press on touch, or from the keyboard: focus a card, Space to pick it up,
arrows to move, Space to drop, Escape to cancel. Enter opens the deal.

## Forking checklist

- [ ] Settings → company profile + accent color (repaints the app at runtime)
- [ ] Settings → rename/reorder pipeline stages
- [ ] Retune `src/lib/heat.ts` for what "urgent" means to this client
- [ ] Swap the adapter in `src/main.tsx`
- [ ] Delete `src/demo/` and its two touchpoints
