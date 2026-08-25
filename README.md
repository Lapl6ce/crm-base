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
| `src/data/` | Entity types, repository contract, the mock adapter, `useResource` |
| `src/lib/` | Design tokens, formatting, `heat.ts` (the urgency function), RBAC |
| `src/components/` | Shared primitives: Button, Field, Table, Overlay, Toast, EmptyState |
| `src/layout/` | AppShell, Sidebar, Topbar, CommandBar, PageHeader |
| `src/modules/` | One folder per feature module |

## Forking checklist

- [ ] Settings → company profile + accent color (repaints the app at runtime)
- [ ] Settings → rename/reorder pipeline stages
- [ ] Retune `src/lib/heat.ts` for what "urgent" means to this client
- [ ] Swap the adapter in `src/main.tsx`
- [ ] Delete `src/demo/` and its two touchpoints
