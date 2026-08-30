import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useResource } from '@/data/useResource';
import { useSession } from '@/data/useSession';
import type { ActivityEntityType, ActivityEvent, ActivityType, ID } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDateTime, formatRelative } from '@/lib/format';
import { tokens } from '@/lib/tokens';

/* The merged activity feed (CONTEXT.md §1, §5 phase 4).
 *
 * It lives in components/ rather than in a module because contacts, companies
 * and deals all render one, and those three may not import each other. Nothing
 * here knows what a Deal is: it takes an entityType and an id, asks the
 * repository for the merged feed, and turns ActivityEvents into sentences.
 *
 * The merge itself is the repository's job. `listForEntity` uses the
 * denormalized related* links to answer "what happened here?" in one lookup —
 * which is how a contact's timeline shows its deals' stage changes without the
 * Contacts module ever touching the Deals module.
 */

export interface ActivityTimelineProps {
  /** Omit both to render the whole app's feed — what the dashboard shows. */
  entityType?: ActivityEntityType;
  entityId?: ID;
  limit?: number;
  className?: string;
}

/* Tone per event type. Won is the one positive thing that happens in a CRM;
   lost is the one bad one. Everything else is neutral chronology and must not
   compete with the heat stripes on the same screen. */
const TONE: Record<ActivityType, { dot: string; label: string }> = {
  'contact.created': { dot: tokens.ink[300], label: 'Contact' },
  'company.created': { dot: tokens.ink[300], label: 'Company' },
  'deal.created': { dot: tokens.ink[300], label: 'Deal' },
  'deal.stage_changed': { dot: tokens.ink[500], label: 'Stage' },
  'deal.won': { dot: tokens.positive[500], label: 'Won' },
  'deal.lost': { dot: tokens.danger[600], label: 'Lost' },
  'task.created': { dot: tokens.ink[300], label: 'Task' },
  'task.completed': { dot: tokens.positive[500], label: 'Done' },
  'note.created': { dot: tokens.warn[500], label: 'Note' },
};

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;
const num = (value: unknown): number | undefined =>
  typeof value === 'number' && !Number.isNaN(value) ? value : undefined;

export function ActivityTimeline({
  entityType,
  entityId,
  limit = 40,
  className,
}: ActivityTimelineProps) {
  const { users, stages } = useSession();

  const { data, loading } = useResource(
    async (provider) => {
      if (entityType && entityId) {
        return provider.activity.listForEntity(entityType, entityId, { limit });
      }
      const page = await provider.activity.list({
        pageSize: limit,
        sort: { field: 'occurredAt', dir: 'desc' },
      });
      return page.items;
    },
    [entityType, entityId, limit],
    { watch: ['activity'] },
  );

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const stageName = (id: unknown) => stages.find((s) => s.id === id)?.name;

  /** An event as a sentence. The payload is untyped by design (it crosses a
      serialization boundary), so every read of it is defensive. */
  const describe = (event: ActivityEvent): string => {
    const payload = event.payload ?? {};
    const title = str(payload.title) ?? str(payload.name) ?? 'a record';
    const value = num(payload.value);
    const money = value === undefined ? '' : ` (${formatCurrency(value, str(payload.currency))})`;

    switch (event.type) {
      case 'contact.created':
        return `added ${title} as a contact`;
      case 'company.created':
        return `added ${title} as a company`;
      case 'deal.created':
        return `opened ${title}${money}`;
      case 'deal.stage_changed': {
        const from = stageName(payload.fromStageId);
        const to = stageName(payload.toStageId);
        if (from && to) return `moved ${title} from ${from} to ${to}`;
        return to ? `moved ${title} to ${to}` : `moved ${title} to another stage`;
      }
      case 'deal.won':
        return `won ${title}${money}`;
      case 'deal.lost':
        return `lost ${title}${money}`;
      case 'task.created':
        return `added the task “${title}”`;
      case 'task.completed':
        return `completed “${title}”`;
      case 'note.created':
        return str(payload.excerpt) ? `wrote: “${payload.excerpt as string}”` : 'wrote a note';
      default:
        return 'made a change';
    }
  };

  const linkFor = (event: ActivityEvent): string | null => {
    // Never link back to the record you are already looking at.
    if (entityId && event.entityType === entityType && event.entityId === entityId) return null;
    switch (event.entityType) {
      case 'deal':
        return `/deals/${event.entityId}`;
      case 'contact':
        return `/contacts/${event.entityId}`;
      case 'company':
        return `/companies/${event.entityId}`;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={cn('flex flex-col gap-3 p-4', className)}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  const events = data ?? [];

  if (events.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          size="sm"
          title="Nothing has happened yet"
          description="Stage changes, completed tasks and notes all land here as they happen."
        />
      </div>
    );
  }

  return (
    <ol className={cn('flex flex-col', className)}>
      {events.map((event, index) => {
        const actor = userById.get(event.actorId);
        const tone = TONE[event.type] ?? { dot: tokens.ink[300], label: 'Event' };
        const href = linkFor(event);
        const last = index === events.length - 1;

        return (
          <li key={event.id} className="flex gap-3 px-4">
            {/* The rail: a dot per event, joined by a line that stops at the
                last one so the feed reads as finished rather than truncated. */}
            <div className="flex flex-col items-center pt-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full ring-2 ring-surface-card"
                style={{ backgroundColor: tone.dot }}
              />
              {!last && <span aria-hidden="true" className="w-px flex-1 bg-ink-100" />}
            </div>

            <div className={cn('min-w-0 flex-1 py-1.5', !last && 'pb-3')}>
              <p className="text-base leading-snug text-ink-700">
                {actor && (
                  <Avatar
                    name={actor.name}
                    color={actor.avatarColor}
                    size="sm"
                    className="mr-1.5 align-text-bottom"
                  />
                )}
                <span className="font-medium text-ink-900">{actor?.name ?? 'Someone'}</span>{' '}
                {href ? (
                  <Link
                    to={href}
                    className="underline-offset-2 hover:text-accent-600 hover:underline"
                  >
                    {describe(event)}
                  </Link>
                ) : (
                  describe(event)
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink-300">
                <span className="tnum" title={formatDateTime(event.occurredAt)}>
                  {formatRelative(event.occurredAt)}
                </span>
                <span aria-hidden="true"> · </span>
                <span>{tone.label}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
