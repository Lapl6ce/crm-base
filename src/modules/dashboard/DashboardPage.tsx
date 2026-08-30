import { Link, useNavigate } from 'react-router-dom';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { HeatLabel } from '@/components/HeatStripe';
import { RecordRow } from '@/components/RecordRow';
import { Skeleton } from '@/components/Skeleton';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDate, pluralize } from '@/lib/format';
import { dealHeat, taskHeat } from '@/lib/heat';
import { can } from '@/lib/rbac';
import { useAnalytics } from './useAnalytics';

/* The landing screen: four numbers, and the two lists that turn them into
 * something to do.
 *
 * The numbers are stat tiles rather than charts on purpose — a single headline
 * figure is not a chart, and four one-bar bar charts would be four ways of
 * saying less. The charts live in Reports, one screen away.
 */

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, stages } = useSession();
  const { derived, loading, error, refresh } = useAnalytics();

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState description={error.message} onRetry={refresh} />;
  if (!derived) return null;

  const { kpis, raw } = derived;
  const currency = raw.deals[0]?.currency ?? 'USD';
  const empty = raw.deals.length === 0 && raw.contacts === 0;

  /* Hottest first — the same ordering the pipeline board uses, from the same
     function (lib/heat.ts). "What needs me" has one definition in this app. */
  const attention = raw.deals
    .filter((deal) => deal.status === 'open')
    .map((deal) => ({ deal, heat: dealHeat(deal) }))
    .sort((a, b) => b.heat.scalar - a.heat.scalar)
    .slice(0, 5);

  const dueTasks = raw.tasks
    .filter((task) => !task.completed && task.dueDate)
    .map((task) => ({ task, heat: taskHeat(task) }))
    .sort((a, b) => b.heat.scalar - a.heat.scalar)
    .slice(0, 5);

  if (empty) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={`Good to see you, ${user?.name?.split(' ')[0] ?? 'there'}`} />
        <Card>
          <EmptyState
            title="Nothing in here yet"
            description="Add a company and a contact to get going — or switch on Demo Mode in Settings to fill the app with a worked example first."
            action={
              <Button variant="primary" onClick={() => navigate('/companies')}>
                Add a company
              </Button>
            }
            secondaryAction={
              <Button variant="ghost" onClick={() => navigate('/settings')}>
                Try Demo Mode
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Good to see you, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Where the pipeline stands, and what is asking for you today."
        actions={
          can(user, 'reports.view') && (
            <Button onClick={() => navigate('/reports')}>See reports</Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open pipeline"
          value={formatCurrency(kpis.openValue, currency, { compact: true })}
          hint={pluralize(kpis.openCount, 'open deal')}
          to="/deals"
        />
        <StatTile
          label="Won this quarter"
          value={formatCurrency(kpis.wonValue, currency, { compact: true })}
          hint={pluralize(kpis.wonCount, 'deal')}
          tone="positive"
          to="/reports"
        />
        <StatTile
          label="Win rate"
          value={kpis.winRate === null ? '—' : `${Math.round(kpis.winRate * 100)}%`}
          hint={
            kpis.winRate === null
              ? 'Nothing closed yet'
              : `of ${pluralize(kpis.closedCount, 'deal')} closed, 90 days`
          }
          to="/reports"
        />
        <StatTile
          label="Tasks needing you"
          value={String(kpis.overdueTasks + kpis.dueSoonTasks)}
          hint={
            kpis.overdueTasks > 0
              ? `${kpis.overdueTasks} overdue · ${kpis.dueSoonTasks} due this week`
              : `${kpis.dueSoonTasks} due this week`
          }
          tone={kpis.overdueTasks > 0 ? 'accent' : undefined}
          to="/tasks"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Needs attention"
            action={
              <Link to="/deals" className="text-xs font-medium text-ink-500 hover:text-ink-900">
                Whole pipeline
              </Link>
            }
          />
          {attention.length === 0 ? (
            <CardBody>
              <EmptyState
                size="sm"
                title="No open deals"
                description="Everything is either won, lost, or not started yet."
              />
            </CardBody>
          ) : (
            <ul className="divide-y divide-ink-100">
              {attention.map(({ deal, heat }) => (
                <li key={deal.id}>
                  <RecordRow
                    to={`/deals/${deal.id}`}
                    heat={heat}
                    title={deal.title}
                    subtitle={stages.find((s) => s.id === deal.stageId)?.name}
                    trailing={formatCurrency(deal.value, deal.currency)}
                    trailingHint={<HeatLabel heat={heat} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Due next"
            action={
              <Link to="/tasks" className="text-xs font-medium text-ink-500 hover:text-ink-900">
                All tasks
              </Link>
            }
          />
          {dueTasks.length === 0 ? (
            <CardBody>
              <EmptyState size="sm" title="Nothing due" description="No open tasks with a date on them." />
            </CardBody>
          ) : (
            <ul className="divide-y divide-ink-100">
              {dueTasks.map(({ task, heat }) => (
                <li key={task.id}>
                  <RecordRow
                    heat={heat}
                    title={task.title}
                    subtitle={task.dueDate ? formatDate(task.dueDate) : undefined}
                    trailingHint={<HeatLabel heat={heat} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Latest activity" />
        <ActivityTimeline limit={12} className="py-2" />
      </Card>
    </div>
  );
}

/* A single headline number is a stat tile, not a chart (CONTEXT.md §4: the
   display face is for figures). Tone is used sparingly — accent only when the
   number is actually asking for something. */
function StatTile({
  label,
  value,
  hint,
  tone,
  to,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'positive' | 'accent';
  to: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col gap-1 rounded-card border border-ink-100 bg-surface-card p-4 shadow-sm',
        'motion-safe:transition-colors hover:border-ink-150',
      )}
    >
      <span className="text-2xs font-semibold uppercase tracking-wide text-ink-300">{label}</span>
      <span
        className={cn(
          'tnum font-display text-xl font-semibold',
          tone === 'positive' ? 'text-positive-600' : tone === 'accent' ? 'text-accent-600' : 'text-ink-900',
        )}
      >
        {value}
      </span>
      <span className="text-xs text-ink-500">{hint}</span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-card lg:col-span-2" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    </div>
  );
}
