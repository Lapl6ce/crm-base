import { useMemo } from 'react';
import {
  eachWeekOfInterval,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  startOfQuarter,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { useResource } from '@/data/useResource';
import { useSession } from '@/data/useSession';
import type { ActivityEvent, Deal, PipelineStage, Task } from '@/data/types';

/* The numbers behind the dashboard and the reports, computed in one place so
 * the two screens can never disagree about what "won this quarter" means.
 *
 * One deliberate choice runs through all of it: **time series come from
 * ActivityEvents, not from record timestamps.** "When did we win this?" is
 * answered by the deal.won event, which is stamped when the deal actually
 * moved. `updatedAt` answers "when did someone last touch the row", which is a
 * different question that happens to look similar until someone edits an old
 * deal's title and it jumps into this month's numbers.
 *
 * Volume note for a real adapter: this pulls whole collections and aggregates
 * in the browser, which is right for a localStorage mock and wrong past a few
 * thousand records. A REST adapter would add aggregate endpoints and this file
 * is where they would land — no screen changes.
 */

export interface AnalyticsData {
  deals: Deal[];
  tasks: Task[];
  events: ActivityEvent[];
  contacts: number;
  companies: number;
}

export function useAnalyticsSource() {
  return useResource(
    async (provider): Promise<AnalyticsData> => {
      const [deals, tasks, events, contacts, companies] = await Promise.all([
        provider.deals.list({ pageSize: 0 }),
        provider.tasks.list({ pageSize: 0 }),
        provider.activity.list({ pageSize: 0 }),
        provider.contacts.list({ pageSize: 1 }),
        provider.companies.list({ pageSize: 1 }),
      ]);
      return {
        deals: deals.items,
        tasks: tasks.items,
        events: events.items,
        contacts: contacts.total,
        companies: companies.total,
      };
    },
    [],
    { watch: ['deals', 'tasks', 'activity', 'contacts', 'companies', 'settings'] },
  );
}

/* --- KPI tiles ----------------------------------------------------------- */

export interface Kpis {
  openValue: number;
  openCount: number;
  wonValue: number;
  wonCount: number;
  /** Won / (won + lost) over the last 90 days, or null when nothing has closed. */
  winRate: number | null;
  closedCount: number;
  overdueTasks: number;
  dueSoonTasks: number;
}

export function computeKpis(data: AnalyticsData, now = new Date()): Kpis {
  const open = data.deals.filter((deal) => deal.status === 'open');
  const quarterStart = startOfQuarter(now);
  const ninetyDaysAgo = subWeeks(now, 13);

  const wonThisQuarter = data.events.filter(
    (event) => event.type === 'deal.won' && isAfter(new Date(event.occurredAt), quarterStart),
  );

  const recentClosed = data.events.filter((event) => {
    if (event.type !== 'deal.won' && event.type !== 'deal.lost') return false;
    return isAfter(new Date(event.occurredAt), ninetyDaysAgo);
  });
  const recentWon = recentClosed.filter((event) => event.type === 'deal.won').length;

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekOut = new Date(now.getTime() + 7 * 86_400_000);

  const openTasks = data.tasks.filter((task) => !task.completed && task.dueDate);

  return {
    openValue: open.reduce((sum, deal) => sum + (deal.value || 0), 0),
    openCount: open.length,
    wonValue: wonThisQuarter.reduce((sum, event) => {
      const value = event.payload?.value;
      return sum + (typeof value === 'number' ? value : 0);
    }, 0),
    wonCount: wonThisQuarter.length,
    winRate: recentClosed.length === 0 ? null : recentWon / recentClosed.length,
    closedCount: recentClosed.length,
    overdueTasks: openTasks.filter((task) => isBefore(new Date(task.dueDate!), now)).length,
    dueSoonTasks: openTasks.filter((task) => {
      const due = new Date(task.dueDate!);
      return !isBefore(due, now) && isBefore(due, weekOut);
    }).length,
  };
}

/* --- chart series -------------------------------------------------------- */

export interface StageDatum {
  stage: string;
  value: number;
  count: number;
}

/**
 * Open pipeline only. Rolling the won and lost columns into a "pipeline value"
 * chart is the quickest way to make a forecast look twice as healthy as it is.
 */
export function pipelineByStage(data: AnalyticsData, stages: PipelineStage[]): StageDatum[] {
  return stages
    .filter((stage) => stage.outcome === 'open')
    .map((stage) => {
      const inStage = data.deals.filter(
        (deal) => deal.stageId === stage.id && deal.status === 'open',
      );
      return {
        stage: stage.name,
        value: inStage.reduce((sum, deal) => sum + (deal.value || 0), 0),
        count: inStage.length,
      };
    });
}

export interface WeekDatum {
  /** ISO date of the week start — the stable key. */
  week: string;
  /** "4 Aug" — what the axis shows. */
  label: string;
  won: number;
  lost: number;
  activity: number;
}

/** The last `weeks` weeks, including the current one, oldest first. */
export function weeklySeries(data: AnalyticsData, weeks = 12, now = new Date()): WeekDatum[] {
  const start = startOfWeek(subWeeks(now, weeks - 1), { weekStartsOn: 1 });
  const buckets = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 }).map((weekStart) => ({
    week: weekStart.toISOString(),
    label: format(weekStart, 'd MMM'),
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
    won: 0,
    lost: 0,
    activity: 0,
  }));

  for (const event of data.events) {
    const at = new Date(event.occurredAt);
    // Linear scan per event over ~12 buckets: cheaper than sorting, and the
    // shape a GROUP BY replaces cleanly when a real backend arrives.
    const bucket = buckets.find((b) => at >= b.start && at <= b.end);
    if (!bucket) continue;
    bucket.activity += 1;
    if (event.type === 'deal.won') bucket.won += 1;
    if (event.type === 'deal.lost') bucket.lost += 1;
  }

  return buckets.map(({ week, label, won, lost, activity }) => ({
    week,
    label,
    won,
    lost,
    activity,
  }));
}

/** The open deals that most need attention — the dashboard's "do this next". */
export function hottestDeals(data: AnalyticsData, limit = 5): Deal[] {
  return data.deals.filter((deal) => deal.status === 'open').slice(0, limit);
}

/* --- the hook the screens actually use ----------------------------------- */

export function useAnalytics() {
  const { stages } = useSession();
  const state = useAnalyticsSource();
  const data = state.data;

  const derived = useMemo(() => {
    if (!data) return null;
    return {
      kpis: computeKpis(data),
      byStage: pipelineByStage(data, stages),
      weekly: weeklySeries(data),
      raw: data,
    };
  }, [data, stages]);

  return { ...state, derived };
}
