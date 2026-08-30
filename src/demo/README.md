# `src/demo/` — DELETE BEFORE CLIENT HANDOFF

Generated data and the switch that loads it. Nothing in here ships to a client.

## Deleting it

```bash
rm -rf src/demo
```

That leaves exactly two compile errors, both in files that already handle the
"no demo" path:

| File | What breaks | What to do |
|---|---|---|
| `src/layout/Sidebar.tsx` | `useDemoMode` / `DemoBadge` import | Delete the import and the `<DemoBadge>` block in the footer |
| `src/modules/settings/SettingsPage.tsx` | `useDemoMode` import | Delete the import and the Demo Mode card |

`AppSettings.demoMode` stays in the data model. It is one boolean, it costs
nothing, and leaving it means a fork can put its own demo back later.

## What the seeder is allowed to do

It writes through `DataProvider` and nothing else — no reaching into
`data/mock/`. If the demo dataset can be built through the public interface,
so can a client's real import script.

## The one visible consequence of that rule

`createdAt` is stamped by the adapter, so every seeded record is created *now*.

- **Deal and task heat are fully exercised**: `expectedCloseDate` and `dueDate`
  are caller-supplied, and the seeder spreads them from three weeks overdue to
  ten weeks out.
- **History is real**: back-dated `ActivityEvent`s are appended through
  `activity.append()`, which does accept `occurredAt`. Each deal gets the
  journey through the stages it must have taken to be where it is, spread over
  the last quarter. This is what the timeline and the "deals over time" report
  read.
- **Contact "last touched" cannot be faked.** It maxes over a contact's events,
  and every contact has a creation event from a moment ago. A freshly seeded
  demo shows "active today" across the contact list and warms up from there.

Fixing the last one would mean letting callers set `createdAt`, which is
exactly the door the repository contract closes on purpose.

## Determinism

The generator runs off a fixed seed, so every reset produces the same dataset.
Screenshots and bug reports stay comparable. Change `seed` in `seedDemoData`
options for a different book of business.
