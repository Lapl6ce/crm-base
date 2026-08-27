# CRM Base — CONTEXT.md

The reusable foundation. This repo is **forked per client**, not shipped as-is.
Read this before touching code; it is the contract every module honors.

**Status:** Phases 1–2 complete (scaffold, data layer, tokens, shell, primitives;
Contacts & Companies end to end). Phase 3 (Deals Pipeline) not started.

---

## 0. Decisions already made

| Decision | Choice | Why |
|---|---|---|
| Stack | Vite + React 18 + TS, Router v6, Zustand, Tailwind, Recharts, date-fns | Per spec |
| Tailwind | v3.4, config-based token system + CSS custom properties | Tokens must be overridable at runtime by Settings → accent color; v3's config is the better-trodden fork target |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Keyboard drag + SR announcements out of the box |
| Persistence | localStorage-backed mock adapter | Survives reload; still zero backend |
| Repo API shape | `Promise`-returning, always async | A REST/DB adapter drops in without touching a single caller |
| Auth | None. A user switcher sets `currentUserId`; role gates UI only | Spec: demo-only roles |
| Dark mode | Not in v1, but every color is a CSS var so a theme is additive | Avoids half-done theming |
| Record detail | Its own route (`/contacts/:id`), with create/edit in a Drawer over it | A record is something you send someone a link to; editing keeps the record in view |
| Cross-module hand-off | URL params — `/contacts?new=1&companyId=…` | Modules cannot import each other's forms (§3). The URL is a contract neither module owns, so neither has to change when the other does |
| List query state | One `useListQuery` hook, shared by every list screen | Search/filter/sort/paginate behaving *identically* everywhere is worth more than any screen's local cleverness |

---

## 1. Data model

IDs are opaque `string` (`type ID = string`). All timestamps are ISO-8601 `string`,
never `Date` — they cross a serialization boundary. Money is a `number` of major
units plus an explicit `currency` code.

### User
```ts
interface User {
  id: ID;
  name: string;
  email: string;
  role: 'admin' | 'sales_rep';
  avatarColor: string;   // token-derived hex, for initials chips
  createdAt: string;
}
```

### Company
```ts
interface Company {
  id: ID;
  name: string;
  domain?: string;
  industry?: string;
  size?: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
  phone?: string;
  website?: string;
  address?: { line1?: string; city?: string; region?: string; postalCode?: string; country?: string };
  ownerId: ID;           // -> User
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Contact
```ts
interface Contact {
  id: ID;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyId?: ID;        // -> Company (optional: not every contact has one)
  jobTitle?: string;     // spec calls this "role"; renamed to avoid collision with User.role
  tags: string[];
  ownerId: ID;           // -> User
  status: 'lead' | 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
```

### Deal
```ts
interface Deal {
  id: ID;
  title: string;
  value: number;
  currency: string;          // 'USD' etc, from AppSettings default
  stageId: ID;               // -> PipelineStage (configurable, see Settings)
  status: 'open' | 'won' | 'lost';
  contactId?: ID;
  companyId?: ID;
  ownerId: ID;
  expectedCloseDate?: string;
  createdAt: string;
  updatedAt: string;
  stageEnteredAt: string;    // powers the heat stripe (stage age)
}
```

### Task
```ts
interface Task {
  id: ID;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completedAt?: string;
  contactId?: ID;            // linked to a contact and/or a deal
  dealId?: ID;
  ownerId: ID;
  createdAt: string;
  updatedAt: string;
}
```

### Note
```ts
interface Note {
  id: ID;
  body: string;
  entityType: 'contact' | 'company' | 'deal';   // polymorphic parent
  entityId: ID;
  authorId: ID;
  createdAt: string;
  updatedAt: string;
}
```

### ActivityEvent — the timeline substrate
Modules never write to each other. They emit events; the timeline reads them.
This is the single mechanism that lets Module 4 merge feeds without cross-imports.

```ts
type ActivityType =
  | 'contact.created' | 'company.created' | 'deal.created'
  | 'deal.stage_changed' | 'deal.won' | 'deal.lost'
  | 'task.created' | 'task.completed'
  | 'note.created';

interface ActivityEvent {
  id: ID;
  type: ActivityType;
  entityType: 'contact' | 'company' | 'deal' | 'task';
  entityId: ID;
  actorId: ID;
  occurredAt: string;
  payload?: Record<string, unknown>;   // e.g. { fromStageId, toStageId }
  // denormalized links so a contact timeline can surface its deal's events
  relatedContactId?: ID;
  relatedCompanyId?: ID;
  relatedDealId?: ID;
}
```

### PipelineStage + AppSettings
```ts
interface PipelineStage {
  id: ID;
  name: string;
  order: number;
  outcome: 'open' | 'won' | 'lost';   // terminal stages drive Deal.status
}

interface AppSettings {
  company: { name: string; logoUrl: string | null; accentColor: string };
  stages: PipelineStage[];
  defaultCurrency: string;
  demoMode: boolean;
  currentUserId: ID;    // stands in for a session
}
```

### Relationship map
```
User ──owns──> Contact, Company, Deal, Task
Company ──1:N──> Contact
Company ──1:N──> Deal
Contact ──1:N──> Deal        (a deal has at most one primary contact)
Contact ──1:N──> Task
Deal ──1:N──> Task
{Contact|Company|Deal} ──1:N──> Note
PipelineStage ──1:N──> Deal
```

**Referential integrity is the adapter's job, not the UI's.** Deleting a Company
nulls `companyId` on its contacts/deals rather than cascading. Deleting a Contact
nulls its links on deals/tasks. Every such rule lives in one place:
`src/data/mock/integrity.ts`.

---

## 2. The data layer contract

Everything the UI can do to data goes through one object. This is the swap seam.

```ts
// src/data/types.ts
export interface ListQuery {
  search?: string;
  filters?: Record<string, unknown>;
  sort?: { field: string; dir: 'asc' | 'desc' };
  page?: number;
  pageSize?: number;
}
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number; }

export interface Repository<T, C, U> {
  list(query?: ListQuery): Promise<Page<T>>;
  get(id: ID): Promise<T | null>;
  create(input: C): Promise<T>;
  update(id: ID, patch: U): Promise<T>;
  delete(id: ID): Promise<void>;
}

export interface DataProvider {
  contacts:  ContactRepository;
  companies: CompanyRepository;
  deals:     DealRepository;
  tasks:     TaskRepository;
  notes:     NoteRepository;
  users:     UserRepository;
  activity:  ActivityRepository;   // read-mostly + append
  settings:  SettingsRepository;   // get()/update() only
  reset(): Promise<void>;          // used by Demo Mode; a real adapter can throw
}
```

Rules, enforced by review:
1. **No UI file imports from `src/data/mock/`.** Only `src/data/types.ts` and the
   provider hook. An ESLint `no-restricted-imports` rule will fail the build on this.
2. Repos are reached only via `useData()` (React context) — never a module singleton.
3. Repos are the only writers of `ActivityEvent`. A stage change emits from
   `DealRepository.update`, not from the Kanban component.
4. Zustand holds **UI state only** (filters, open drawers, board drag state,
   command-bar visibility). Server-shaped data lives in repo-backed hooks with
   local cache. Mixing the two is what makes a data layer un-swappable.

---

## 3. Folder structure

```
src/
  main.tsx
  App.tsx                     # router + providers only
  data/
    types.ts                  # entities, ListQuery, Repository, DataProvider
    repositories.ts           # per-entity interface specializations
    DataProvider.tsx          # React context + useData()
    useResource.ts            # the four-state read hook + useMutation
    useSession.ts             # current user + settings
    useListQuery.ts           # search/filter/sort/page state -> a ListQuery
    formErrors.ts             # ValidationError -> a form's field map
    bus.ts                    # change bus: repos announce writes, hooks refetch
    mock/
      index.ts                # createMockProvider(): DataProvider
      storage.ts              # localStorage read/write, namespaced, versioned
      collection.ts           # generic in-memory collection w/ query engine
      integrity.ts            # cascade/null-out rules
      activity.ts             # event emission helpers
  demo/                       # ⚠ DEMO ONLY — DELETE BEFORE CLIENT HANDOFF
    README.md
    seed.ts                   # generator: contacts, companies, deals, tasks, notes
    names.ts                  # fake name/company/industry pools
    DemoBadge.tsx
    useDemoMode.ts            # the ONLY file core code imports, via one guarded call
  modules/
    contacts/                 # Phase 2
      ContactsPage.tsx        # list: search / filter / sort / paginate
      ContactDetailPage.tsx   # route /contacts/:id
      ContactForm.tsx         # create + edit, one Drawer
      useContacts.ts          # every read and write this module performs
      contactMeta.ts          # status wording/tone, default sort
    companies/                # Phase 2, same five files
      CompaniesPage.tsx
      CompanyDetailPage.tsx
      CompanyForm.tsx
      useCompanies.ts
      companyMeta.ts          # size labels, address + website formatting
    deals/
    tasks/
    dashboard/
    settings/
    users/
  components/                 # shared primitives: Button, Field, Select, Table,
                              # Drawer, Modal, Tag, Avatar, EmptyState, HeatStripe,
                              # Toast, ConfirmDialog, Skeleton, Pagination,
                              # ListToolbar, TagInput, DescriptionList, OwnerSelect
  layout/                     # AppShell, Sidebar, Topbar, PageHeader
  lib/
    tokens.ts                 # design tokens as TS (mirrors tailwind.config)
    format.ts                 # currency, dates, initials
    heat.ts                   # the urgency→temperature function (signature element)
    rbac.ts                   # can(user, action) — role gates
    cn.ts
  routes.tsx
```

**Module isolation rule:** `modules/deals/*` may import from `components/`,
`lib/`, `layout/`, and `data/`. It may **not** import from `modules/contacts/*`.
When Deals needs to show a contact name it goes through `data`, not through the
Contacts module. Enforced with the same ESLint restricted-import rule.

**Demo Mode isolation:** exactly two touchpoints in core code —
a `<DemoBadge />` slot in the sidebar footer and a toggle row in Settings, both
behind `import { useDemoMode } from '@/demo/useDemoMode'`. Deleting `src/demo/`
leaves two import errors, both in files that already handle the "no demo" path.
The seeder writes only through `DataProvider` — it has no privileged access.

---

## 4. Design plan — "Signal"

A CRM is a tool people live in for eight hours, not a landing page. Signal is
built to read fast at a glance and stay calm at density: graphite chrome, white
work surfaces, and exactly one hot color that always means *act on this*.

### Color — 6 named values
| Token | Hex | Role |
|---|---|---|
| `graphite` | `#17191C` | Sidebar, headings, primary text |
| `cool-grey` | `#F1F3F5` | App background |
| `card` | `#FFFFFF` | Every work surface |
| `coral` | `#FF4E3A` | Primary action, focus ring, peak urgency |
| `teal` | `#0E7C7B` | Won / positive / completed |
| `mute` | `#8A9199` | Meta text, dividers, cold state |

Derived scale (in `tailwind.config.ts`, all emitted as CSS vars):
`ink.900 #17191C · ink.700 #2A2E33 · ink.500 #545B63 · ink.300 #8A9199 · ink.150 #C8CDD2 · ink.100 #E1E5E9`
`accent.600 #E5402D · accent.500 #FF4E3A · accent.100 #FFE9E5`
`positive.600 #0B6362 · positive.500 #0E7C7B · positive.100 #DCEFEE`
`warn.500 #B8730B · warn.100 #FBEEDA` (mid-heat, never an action)
`danger.600 #A4231A` — deliberately *darker* than coral so "delete" never reads
as "the main button."

Contrast: body text `ink.700` on `card` = 12.6:1. `mute` is meta-only, never
below 16px. Coral on white is 3.6:1 → used as a **fill** with white text
(4.5:1+) or as a 3px+ graphic element, never as small text on white.

### Type
- **Display — Space Grotesk** (600/700): page titles, KPI values, stage headers,
  the wordmark. Slightly mechanical, wide apertures, distinctive at large sizes.
- **Body — IBM Plex Sans** (400/500/600): all UI text, tables, forms. Designed
  for interfaces, holds up at 13px, pairs with Grotesk without competing.
- **Numeric — IBM Plex Mono** (500), `font-variant-numeric: tabular-nums`:
  money, dates, counts. Columns of currency line up; this is the single biggest
  legibility win in a CRM table and costs nothing.

Scale: `11 · 12 · 13 · 14 · 16 · 20 · 26 · 34 · 44`. Base UI size 14px, table
rows 13px. Line height 1.45 body / 1.15 display.
Spacing: 4px base, `4 8 12 16 24 32 48 64`. Radii: `4` inputs, `8` cards, `12`
modals/drawers. Two shadows only: `sm` for cards, `lg` for overlays.

### Signature element — the heat system + command bar
One idea, applied consistently, that makes a screenshot identifiable:

**Every record carries a 3px temperature stripe on its left edge.** One function,
`lib/heat.ts`, maps "how much does this need me right now?" to a 0–1 scalar:
- Deals: days until `expectedCloseDate`, weighted by days in `stageEnteredAt`
- Tasks: days until `dueDate`, weighted by `priority`
- Contacts: days since last `ActivityEvent`

Scalar → color: `mute → warn.500 → coral`. Cold records recede; hot ones pull
the eye across the whole app, board, list, and timeline alike. Because it is one
function, a fork can retune urgency for a field-service client (SLA breach) or a
retail client (reorder point) by editing a single file.

Crucially, **heat is never the only signal** — the stripe always sits beside
plain text (`closes in 3d`, `overdue 2d`), so it survives color blindness and
carries no meaning on its own.

Paired with it: a **persistent command bar** in the topbar (`⌘K` / `Ctrl-K`),
not a hidden shortcut. Fuzzy jump-to across contacts, companies, deals and tasks
plus verb commands (`new deal`, `demo: reset`). It is the reason the app feels
fast rather than clicked-through.

### Client customization hook
`AppSettings.company.accentColor` writes `--color-accent-500` (and derives
600/100 via `color-mix`) onto `:root` at runtime. A forked client changes their
accent in Settings and the entire app — buttons, focus rings, hot end of the
heat ramp — follows. No rebuild, no token edits.

### Standard bar
- Responsive: sidebar → icon rail at `md`, → bottom sheet nav at `sm`. Tables
  collapse to stacked cards below `md`. Kanban scrolls horizontally with snap.
- Focus: `2px` coral ring, `2px` offset, visible on every interactive element;
  on graphite surfaces the ring switches to `#FFFFFF`. Never `outline: none`.
- Empty states: each says what to do and gives the button to do it —
  *"No deals in Qualified yet. Drag one over, or create a deal."* Not "No data".
- Reduced motion: all transitions behind `@media (prefers-reduced-motion: no-preference)`.
  Drag reordering degrades to instant. Heat colors never animate.

---

## 5. Build phases

1. ~~**Scaffold**~~ — ✅ done. Vite/TS/Tailwind config, tokens, `data/`
   interfaces + mock adapter + localStorage, AppShell, router, shared
   primitives. The architecture rules in §2 and §3 are enforced by
   `no-restricted-imports` in `.eslintrc.cjs`, not by convention.
2. ~~**Contacts & Companies**~~ — ✅ done. Both list screens run every
   narrowing through `ListQuery` and back into the repository — never by
   filtering an array in the browser, because only one of those two still
   works against a real backend. Detail views are routes; forms are Drawers.
   Validation is the adapter's: the form submits, catches `ValidationError`
   and renders its field map, which is the same path a server response takes.
   Contacts carry the heat stripe (neglect, from `lastActivityByContact`);
   companies deliberately do not — a company has no due date of its own, and a
   stripe with nothing behind it is decoration pretending to be signal.
3. **Deals Pipeline** — dnd-kit board, stage config wiring, deal detail.
4. **Tasks + Notes/Timeline** — task list, the merged ActivityEvent feed.
5. **Dashboard & Reports** — 4 KPI cards, 3 Recharts views.
6. **Roles + Settings + Demo Mode** — rbac gates, settings screens, `src/demo/`.
7. **Polish** — empty/error/loading states, responsive sweep, a11y pass.

---

## 6. Known gaps (deliberate, for the fork to fill)
- No auth, no server, no multi-tenancy.
- No file/attachment storage.
- No email or calendar integration.
- Bulk actions and CSV import/export are out of v1 scope.
- i18n: strings are inline. Extraction is a fork concern.
