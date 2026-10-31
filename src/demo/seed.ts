import type { DataProvider } from '@/data/repositories';
import type { Company, Contact, Deal, ID, PipelineStage, User } from '@/data/types';
import {
  CITIES,
  COMPANY_NAMES,
  COMPANY_TAGS,
  CONTACT_TAGS,
  DEAL_SUBJECTS,
  DEMO_USERS,
  FIRST_NAMES,
  INDUSTRIES,
  JOB_TITLES,
  LAST_NAMES,
  NOTE_BODIES,
  STREETS,
  TASK_TITLES,
} from './names';

/* ⚠ DEMO ONLY — deleted before client handoff.
 *
 * The seeder writes through `DataProvider` and nothing else. It has no
 * privileged access to the adapter (CONTEXT.md §3), which is the point: if the
 * demo dataset can be built through the public interface, so can anything a
 * client's own import script needs to do.
 *
 * That constraint has one visible consequence, and it is worth knowing before
 * you judge the demo: `createdAt` is stamped by the adapter, so every record is
 * created *now*. Dates the caller owns — `expectedCloseDate`, `dueDate` — are
 * spread across weeks, so deal and task heat are fully exercised. History is
 * spread by appending back-dated ActivityEvents through `activity.append()`,
 * which does accept `occurredAt`. What cannot be faked is a contact's
 * "last touched" reading: it maxes over that contact's events, and every
 * contact has a creation event from a moment ago. On a freshly seeded demo the
 * contact list reads "active today" across the board and warms up from there.
 */

export interface SeedSummary {
  users: number;
  companies: number;
  contacts: number;
  deals: number;
  tasks: number;
  notes: number;
  events: number;
}

export interface SeedOptions {
  companies?: number;
  contacts?: number;
  deals?: number;
  tasks?: number;
  notes?: number;
  /** Same seed, same dataset — so a demo looks identical every time it runs. */
  seed?: number;
}

/* A small deterministic PRNG. Math.random would give a different-looking demo
   on every reset, which makes screenshots and bug reports harder to compare. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;

export async function seedDemoData(
  provider: DataProvider,
  options: SeedOptions = {},
): Promise<SeedSummary> {
  const {
    companies: companyCount = 14,
    contacts: contactCount = 58,
    deals: dealCount = 46,
    tasks: taskCount = 52,
    notes: noteCount = 38,
    seed = 20260830,
  } = options;

  const random = mulberry32(seed);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const between = (min: number, max: number) => min + random() * (max - min);
  const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
  const chance = (probability: number) => random() < probability;
  const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();
  const someOf = <T>(list: readonly T[], max: number): T[] => {
    const taken = new Set<T>();
    const target = intBetween(0, max);
    while (taken.size < target) taken.add(pick(list));
    return [...taken];
  };

  const summary: SeedSummary = {
    users: 0,
    companies: 0,
    contacts: 0,
    deals: 0,
    tasks: 0,
    notes: 0,
    events: 0,
  };

  /* --- users ------------------------------------------------------------- */

  const existingUsers = await provider.users.all();
  const users: User[] = [...existingUsers];
  for (const demoUser of DEMO_USERS) {
    if (users.some((u) => u.email.toLowerCase() === demoUser.email)) continue;
    try {
      users.push(await provider.users.create(demoUser));
      summary.users += 1;
    } catch {
      // A duplicate email on a re-seed is not worth failing the whole run for.
    }
  }
  // Pipeline records belong to the sales team; operations and finance users own none.
  const reps = users.filter((u) => u.role === 'sales_rep' && (!u.team || u.team === 'sales'));
  const owner = () => (reps.length > 0 ? pick(reps) : users[0]);

  /* --- pipeline ---------------------------------------------------------- */

  const settings = await provider.settings.get();
  const stages = [...settings.stages].sort((a, b) => a.order - b.order);
  const openStages = stages.filter((s) => s.outcome === 'open');
  const wonStage = stages.find((s) => s.outcome === 'won');
  const lostStage = stages.find((s) => s.outcome === 'lost');

  /* --- companies --------------------------------------------------------- */

  const names = [...COMPANY_NAMES];
  const companies: Company[] = [];
  for (let i = 0; i < companyCount && names.length > 0; i += 1) {
    const name = names.splice(Math.floor(random() * names.length), 1)[0];
    const [city, region, postalCode] = pick(CITIES);
    companies.push(
      await provider.companies.create({
        name,
        domain: `${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
        industry: pick(INDUSTRIES),
        size: pick(['1-10', '11-50', '51-200', '201-1000', '1000+'] as const),
        phone: `+44 20 7${intBetween(100, 999)} ${intBetween(1000, 9999)}`,
        website: `https://${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
        address: { line1: `${intBetween(1, 90)} ${pick(STREETS)}`, city, region, postalCode, country: 'United Kingdom' },
        tags: someOf(COMPANY_TAGS, 2),
        ownerId: owner().id,
      }),
    );
    summary.companies += 1;
  }

  /* --- contacts ---------------------------------------------------------- */

  const contacts: Contact[] = [];
  for (let i = 0; i < contactCount; i += 1) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    // A tenth of contacts have no company: the "unlinked" path has to be
    // visible in a demo, or nobody discovers it works.
    const company = chance(0.9) && companies.length > 0 ? pick(companies) : undefined;
    contacts.push(
      await provider.contacts.create({
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${
          company?.domain ?? 'example.com'
        }`,
        phone: `+44 7${intBetween(100, 999)} ${intBetween(100000, 999999)}`,
        jobTitle: pick(JOB_TITLES),
        companyId: company?.id,
        status: chance(0.4) ? 'lead' : chance(0.85) ? 'active' : 'inactive',
        tags: someOf(CONTACT_TAGS, 3),
        ownerId: company?.ownerId ?? owner().id,
      }),
    );
    summary.contacts += 1;
  }

  /* --- deals ------------------------------------------------------------- */

  /* Won and lost deals are created *directly* in their terminal stage rather
     than moved there. Moving would emit a deal.won at this instant, and the
     back-dated one appended below would then be a duplicate. */
  /* Roughly three open deals for every two closed, and rather more lost than
     won. A demo that shows an 80% win rate does not read as a real book of
     business — it reads as a demo, which is the one thing it must not do. */
  const dealStageFor = (): PipelineStage => {
    const roll = random();
    if (roll < 0.6 || (!wonStage && !lostStage)) return pick(openStages);
    if (roll < 0.75 && wonStage) return wonStage;
    return lostStage ?? wonStage ?? pick(openStages);
  };

  const deals: Deal[] = [];
  for (let i = 0; i < dealCount; i += 1) {
    const contact = contacts.length > 0 && chance(0.85) ? pick(contacts) : undefined;
    const company = contact?.companyId
      ? companies.find((c) => c.id === contact.companyId)
      : companies.length > 0
        ? pick(companies)
        : undefined;
    const stage = dealStageFor();

    deals.push(
      await provider.deals.create({
        title: `${company?.name.split(' ')[0] ?? 'New'} ${pick(DEAL_SUBJECTS)}`,
        // Log-ish spread: many small deals, a few large ones, which is what
        // makes a pipeline-by-stage chart worth looking at.
        value: Math.round(Math.exp(between(7.5, 11.6)) / 250) * 250,
        stageId: stage.id,
        contactId: contact?.id,
        companyId: company?.id,
        ownerId: contact?.ownerId ?? company?.ownerId ?? owner().id,
        // Spread well either side of today so the heat ramp shows its whole
        // range: overdue, closing this week, and comfortably distant.
        expectedCloseDate: chance(0.85) ? daysFromNow(intBetween(-25, 75)) : undefined,
      }),
    );
    summary.deals += 1;
  }

  /* --- back-dated history ------------------------------------------------ */

  /* The one thing record creation cannot give us: a past. Each deal gets a
     plausible journey through the stages it must have passed to be where it
     is, written as events at times that actually spread over the last quarter.
     This is what the timeline and the "deals over time" report read. */
  const appendEvent = async (event: Parameters<DataProvider['activity']['append']>[0]) => {
    await provider.activity.append(event);
    summary.events += 1;
  };

  for (const deal of deals) {
    const stage = stages.find((s) => s.id === deal.stageId);
    if (!stage) continue;

    /* The path is walked through the OPEN stages only, then jumps straight to
       a terminal one. Walking the raw stage array instead would march a lost
       deal through "Closed Won" on its way to "Closed Lost" and emit a
       deal.won for it — which would quietly inflate every win-rate number in
       the reports. */
    const reachedOpen =
      stage.outcome === 'open'
        ? openStages.findIndex((s) => s.id === stage.id)
        : intBetween(1, Math.max(1, openStages.length - 1));

    const path = openStages.slice(0, Math.max(0, reachedOpen) + 1);
    if (stage.outcome !== 'open') path.push(stage);

    /* Timestamps must come out strictly decreasing in "days ago", or two steps
       land on the same day and the timeline can show a deal being won before
       it reached the stage it was won from. Each step leaves at least one day
       of room for every step still to come. */
    const steps = path.length - 1;
    let cursor = Math.max(intBetween(20, 110), steps + 1);

    for (let step = 0; step < steps; step += 1) {
      const from = path[step];
      const to = path[step + 1];
      const floor = steps - 1 - step + 1; // days that must remain afterwards
      const maxDrop = Math.max(1, cursor - floor);
      cursor -= Math.min(intBetween(3, 20), maxDrop);

      const terminal = to.outcome !== 'open';
      await appendEvent({
        type: terminal ? (to.outcome === 'won' ? 'deal.won' : 'deal.lost') : 'deal.stage_changed',
        entityType: 'deal',
        entityId: deal.id,
        actorId: deal.ownerId,
        occurredAt: daysFromNow(-cursor),
        payload: { fromStageId: from.id, toStageId: to.id, title: deal.title, value: deal.value },
        relatedDealId: deal.id,
        relatedContactId: deal.contactId,
        relatedCompanyId: deal.companyId,
      });
    }
  }

  /* --- tasks ------------------------------------------------------------- */

  for (let i = 0; i < taskCount; i += 1) {
    const onDeal = deals.length > 0 && chance(0.6);
    const deal = onDeal ? pick(deals) : undefined;
    const contact = deal?.contactId
      ? contacts.find((c) => c.id === deal.contactId)
      : contacts.length > 0
        ? pick(contacts)
        : undefined;

    const task = await provider.tasks.create({
      title: pick(TASK_TITLES),
      description: chance(0.35) ? pick(NOTE_BODIES) : undefined,
      // Overdue, due today, due this week, due later — every band the task
      // heat function distinguishes.
      dueDate: chance(0.9) ? daysFromNow(intBetween(-9, 21)) : undefined,
      priority: chance(0.25) ? 'high' : chance(0.7) ? 'medium' : 'low',
      contactId: contact?.id,
      dealId: deal?.id,
      ownerId: deal?.ownerId ?? contact?.ownerId ?? owner().id,
    });
    summary.tasks += 1;

    // A third are already done, so the list has both states to show.
    if (chance(0.34)) await provider.tasks.setCompleted(task.id, true, task.ownerId);
  }

  /* --- notes ------------------------------------------------------------- */

  for (let i = 0; i < noteCount; i += 1) {
    const roll = random();
    const target =
      roll < 0.5 && contacts.length > 0
        ? { entityType: 'contact' as const, entityId: pick(contacts).id }
        : roll < 0.8 && deals.length > 0
          ? { entityType: 'deal' as const, entityId: pick(deals).id }
          : companies.length > 0
            ? { entityType: 'company' as const, entityId: pick(companies).id }
            : null;
    if (!target) continue;

    await provider.notes.create({ ...target, body: pick(NOTE_BODIES), authorId: owner().id });
    summary.notes += 1;
  }

  return summary;
}

/** Reachable ids for anything that wants to deep-link into the seeded data. */
export type SeededIds = { contacts: ID[]; companies: ID[]; deals: ID[] };
