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
| 3 | Deals Pipeline — dnd-kit board, stage config | — |
| 4 | Tasks + Notes/Timeline | — |
| 5 | Dashboard & Reports | — |
| 6 | Roles + Settings + Demo Mode | — |
| 7 | Polish — states, responsive, a11y | — |

There is no seed data before Phase 6, so a fresh clone opens on empty states.
Create a company, then a contact, to see the list screens with something in them.

## Forking checklist

- [ ] Settings → company profile + accent color (repaints the app at runtime)
- [ ] Settings → rename/reorder pipeline stages
- [ ] Retune `src/lib/heat.ts` for what "urgent" means to this client
- [ ] Swap the adapter in `src/main.tsx`
- [ ] Delete `src/demo/` and its two touchpoints
