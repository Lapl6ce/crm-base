import type { TagTone } from '@/components/Tag';
import type { Priority, SortDirection } from '@/data/types';

/* Module-local vocabulary for tasks. */

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/* High priority is the only one that gets a colour. If "medium" were also
   tinted, the list would be a wall of chips and none of them would mean
   anything — the heat stripe is already carrying urgency. */
export const PRIORITY_TONE: Record<Priority, TagTone> = {
  high: 'accent',
  medium: 'neutral',
  low: 'neutral',
};

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABEL) as Priority[]).map((value) => ({
  value,
  label: PRIORITY_LABEL[value],
}));

/** Soonest first: a task list is a queue, and a queue is ordered by when. */
export const TASK_DEFAULT_SORT: { field: string; dir: SortDirection } = {
  field: 'dueDate',
  dir: 'asc',
};

/** The open/done split is a filter on `completed`, exposed as tabs. */
export type TaskScope = 'open' | 'done' | 'all';

export const TASK_SCOPES: { value: TaskScope; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All' },
];

export function scopeFilter(scope: TaskScope): Record<string, unknown> {
  if (scope === 'open') return { completed: false };
  if (scope === 'done') return { completed: true };
  return {};
}
