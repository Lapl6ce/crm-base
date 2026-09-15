import { Card } from '@/components/Card';
import { AXIS_TEXT, ChartCard, ChartTooltip, GRID } from '@/components/ChartCard';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useAnalytics } from '@/data/useAnalytics';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatNumber } from '@/lib/format';
import { tokens } from '@/lib/tokens';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const WON = tokens.positive[500];
const LOST = tokens.danger[600];
const NEUTRAL = tokens.ink[500];

export function SalesReportsPage() {
  const { settings } = useSession();
  const { derived, loading, error, refresh } = useAnalytics();
  const currency = settings?.defaultCurrency ?? 'USD';

  if (loading) return <ReportsSkeleton />;
  if (error) return <ErrorState description={error.message} onRetry={refresh} />;
  if (!derived) return null;

  const { byStage, weekly, raw } = derived;
  const hasDeals = raw.deals.length > 0;
  const totalOpen = byStage.reduce((sum, row) => sum + row.value, 0);
  const closedInWindow = weekly.reduce((sum, week) => sum + week.won + week.lost, 0);

  if (!hasDeals) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Sales Performance Reports" description="Where the pipeline stands and how it is moving." />
        <Card>
          <EmptyState
            title="Nothing to report yet"
            description="Reports read the pipeline and the activity log. Add a few deals to populate the analytics."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sales Performance Reports"
        description="Where the pipeline stands and how it has been moving. Every chart has a table view."
      />

      <ChartCard
        title="Open pipeline by stage"
        caption={`${formatCurrency(totalOpen, currency)} across ${byStage.reduce((n, r) => n + r.count, 0)} open deals. Closed stages are excluded.`}
        columns={['Stage', 'Deals', 'Value']}
        rows={byStage.map((row) => [row.stage, row.count, formatCurrency(row.value, currency)])}
        height={300}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byStage} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
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
            <Bar dataKey="value" fill={NEUTRAL} radius={[0, 4, 4, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Deals won and lost"
          caption={
            closedInWindow === 0
              ? 'Nothing has closed in the last 12 weeks.'
              : `${closedInWindow} deals closed over the last 12 weeks.`
          }
          columns={['Week', 'Won', 'Lost']}
          rows={weekly.map((week) => [week.label, week.won, week.lost])}
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

        <ChartCard
          title="Activity volume"
          caption="Everything recorded in the activity log each week — deals moving, tasks completed, notes written."
          columns={['Week', 'Events']}
          rows={weekly.map((week) => [week.label, week.activity])}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekly} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
              <defs>
                <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NEUTRAL} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={NEUTRAL} stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
                cursor={{ stroke: tokens.ink[150], strokeWidth: 1 }}
                content={({ active, label, payload }) => (
                  <ChartTooltip
                    active={active}
                    label={`Week of ${label}`}
                    rows={
                      payload?.[0]
                        ? [
                            {
                              key: 'activity',
                              label: 'Events',
                              value: formatNumber(Number(payload[0].value)),
                              color: NEUTRAL,
                            },
                          ]
                        : []
                    }
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="activity"
                stroke={NEUTRAL}
                strokeWidth={2}
                fill="url(#activity-fill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: tokens.surface.card }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-80 rounded-card" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );
}

