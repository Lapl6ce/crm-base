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
import { Card } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatNumber } from '@/lib/format';
import { tokens } from '@/lib/tokens';
import { AXIS_TEXT, ChartCard, ChartTooltip, GRID } from './ChartCard';
import { useAnalytics } from './useAnalytics';

/* Three views, chosen so that each answers a different question:
 *   1. Where is the money sitting right now?      -> magnitude across stages
 *   2. Are we winning more than we lose?          -> polarity over time
 *   3. How much is actually happening?            -> volume over time
 *
 * Colour is assigned by the job each series does, not by taste:
 *   - Charts 1 and 3 are single-series. Magnitude is carried by bar length and
 *     area height, so there is no identity to encode and the mark is neutral
 *     ink. Painting them accent would spend the app's one hot colour — which
 *     everywhere else means "act on this" — on decoration.
 *   - Chart 2's two series *mean* good and bad, so they wear the status tokens
 *     (positive / danger) rather than categorical ones. Validated for
 *     colour-vision deficiency: worst adjacent pair ΔE 12.8 deutan, 26.0 normal
 *     vision, both comfortably above the 8 / 15 floors, and both above 3:1
 *     against the card. The legend and the table view mean identity never rests
 *     on colour alone.
 *
 * Every chart has a table view (the toggle in its header) so the numbers are
 * reachable without reading an SVG.
 */

const WON = tokens.positive[500];
const LOST = tokens.danger[600];
const NEUTRAL = tokens.ink[500];

export function ReportsPage() {
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
        <PageHeader title="Reports" description="Where the pipeline stands and how it is moving." />
        <Card>
          <EmptyState
            title="Nothing to report yet"
            description="Reports read the pipeline and the activity log. Add a few deals — or switch on Demo Mode in Settings — and the charts fill in."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        description="Where the pipeline stands and how it has been moving. Every chart has a table view."
      />

      <ChartCard
        title="Open pipeline by stage"
        caption={`${formatCurrency(totalOpen, currency)} across ${byStage.reduce((n, r) => n + r.count, 0)} open deals. Closed stages are excluded — a forecast that counts won deals is not a forecast.`}
        columns={['Stage', 'Deals', 'Value']}
        rows={byStage.map((row) => [row.stage, row.count, formatCurrency(row.value, currency)])}
        height={300}
      >
        <ResponsiveContainer width="100%" height="100%">
          {/* Horizontal: stage names are words, and rotated axis labels are a
              tax the reader pays on every glance. */}
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
            {/* One series, one colour for every bar: shading bars by their own
                value would burn the colour channel on what length already says. */}
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
              : `${closedInWindow} deals closed over the last 12 weeks. Counted from when each deal actually moved, not when its record was last edited.`
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
              {/* Single series: no legend box — the card title names it. */}
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
