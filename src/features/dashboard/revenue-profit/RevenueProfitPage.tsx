import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { AXIS_TEXT, ChartCard, ChartTooltip, GRID } from '@/components/ChartCard';
import { useAnalytics } from '@/data/useAnalytics';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { cn } from '@/lib/cn';
import { formatCurrency, formatNumber, pluralize } from '@/lib/format';
import { tokens } from '@/lib/tokens';

const WON = tokens.positive[500];
const LOST = tokens.danger[600];
const NEUTRAL = tokens.ink[500];

export function RevenueProfitPage() {
  const navigate = useNavigate();
  const { settings } = useSession();
  const { derived, loading, error, refresh } = useAnalytics();
  const currency = settings?.defaultCurrency ?? 'USD';

  if (loading) return <RevenueProfitSkeleton />;
  if (error) return <ErrorState description={error.message} onRetry={refresh} />;
  if (!derived) return null;

  const { kpis, byStage, weekly, raw } = derived;
  const hasDeals = raw.deals.length > 0;
  const totalOpen = byStage.reduce((sum, row) => sum + row.value, 0);
  const closedInWindow = weekly.reduce((sum, week) => sum + week.won + week.lost, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Revenue & Profit Overview"
        description="Top-line executive indicators, pipeline progression, and quarterly win/loss dynamics."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/dashboard/action-center')}>
              Action Center
            </Button>
            <Button variant="primary" onClick={() => navigate('/crm/pipeline-deals')}>
              View Pipeline
            </Button>
          </div>
        }
      />

      {/* 4 Core Stat Tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open Pipeline Value"
          value={formatCurrency(kpis.openValue, currency, { compact: true })}
          hint={pluralize(kpis.openCount, 'open deal')}
          to="/crm/pipeline-deals"
        />
        <StatTile
          label="Won This Quarter"
          value={formatCurrency(kpis.wonValue, currency, { compact: true })}
          hint={pluralize(kpis.wonCount, 'deal')}
          tone="positive"
          to="/reports/sales-reports"
        />
        <StatTile
          label="Win Conversion Rate"
          value={kpis.winRate === null ? '—' : `${Math.round(kpis.winRate * 100)}%`}
          hint={
            kpis.winRate === null
              ? 'Nothing closed yet'
              : `of ${pluralize(kpis.closedCount, 'closed deal')}, 90 days`
          }
          to="/reports/sales-reports"
        />
        <StatTile
          label="Pending Operational Actions"
          value={String(kpis.overdueTasks + kpis.dueSoonTasks)}
          hint={
            kpis.overdueTasks > 0
              ? `${kpis.overdueTasks} overdue · ${kpis.dueSoonTasks} due this week`
              : `${kpis.dueSoonTasks} due this week`
          }
          tone={kpis.overdueTasks > 0 ? 'accent' : undefined}
          to="/dashboard/action-center"
        />
      </div>

      {!hasDeals ? (
        <Card>
          <EmptyState
            title="No pipeline deals yet"
            description="Add deals or enable Demo Mode in Administration Settings to visualize revenue forecasting."
            action={
              <Button variant="primary" onClick={() => navigate('/crm/pipeline-deals')}>
                Create Deal
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard
            title="Open pipeline by stage"
            caption={`${formatCurrency(totalOpen, currency)} across ${byStage.reduce((n, r) => n + r.count, 0)} open deals. Terminal stages excluded.`}
            columns={['Stage', 'Deals', 'Value']}
            rows={byStage.map((row) => [row.stage, row.count, formatCurrency(row.value, currency)])}
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="" />
                <XAxis
                  type="number"
                  tick={AXIS_TEXT}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  tickFormatter={(value: number) => formatCurrency(value, currency, { compact: true })}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={110}
                  tick={AXIS_TEXT}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                />
                <Tooltip
                  cursor={{ fill: tokens.surface.sunken }}
                  content={({ active, label, payload }) => (
                    <ChartTooltip
                      active={active}
                      label={label as string}
                      rows={
                        payload?.[0]
                          ? [
                              {
                                key: 'value',
                                label: 'Open value',
                                value: formatCurrency(Number(payload[0].value), currency),
                                color: NEUTRAL,
                              },
                              {
                                key: 'count',
                                label: 'Deals',
                                value: formatNumber(payload[0].payload.count),
                              },
                            ]
                          : []
                      }
                    />
                  )}
                />
                <Bar dataKey="value" fill={NEUTRAL} radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Deals won and lost (Last 12 Weeks)"
            caption={
              closedInWindow === 0
                ? 'Nothing closed in the last 12 weeks.'
                : `${closedInWindow} deals closed over the last 12 weeks from actual outcome stamps.`
            }
            columns={['Week', 'Won', 'Lost']}
            rows={weekly.map((week) => [week.label, week.won, week.lost])}
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 4, right: 8, bottom: 4, left: -18 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="" />
                <XAxis
                  dataKey="label"
                  tick={AXIS_TEXT}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis tick={AXIS_TEXT} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                <Tooltip
                  cursor={{ fill: tokens.surface.sunken }}
                  content={({ active, label, payload }) => (
                    <ChartTooltip
                      active={active}
                      label={`Week of ${label}`}
                      rows={(payload ?? []).map((entry) => ({
                        key: String(entry.dataKey),
                        label: entry.dataKey === 'won' ? 'Won' : 'Lost',
                        value: formatNumber(Number(entry.value)),
                        color: entry.dataKey === 'won' ? WON : LOST,
                      }))}
                    />
                  )}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={28}
                  iconType="square"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-ink-500">{value === 'won' ? 'Won' : 'Lost'}</span>
                  )}
                />
                <Bar dataKey="won" fill={WON} radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="lost" fill={LOST} radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Summary insights bar */}
      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Need real-time AI strategic recommendations?</h3>
            <p className="text-xs text-ink-500">
              The AI Insights engine continuously evaluates pipeline velocity, stock levels, and margin anomalies.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/dashboard/ai-insights')}>
            View AI Insights
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

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
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(to)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(to)}
      className={cn(
        'flex cursor-pointer flex-col gap-1 rounded-card border border-ink-100 bg-surface-card p-4 shadow-sm',
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
    </div>
  );
}

function RevenueProfitSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );
}
