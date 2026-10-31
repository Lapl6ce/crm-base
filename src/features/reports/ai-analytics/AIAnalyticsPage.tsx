import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { AXIS_TEXT, ChartCard, ChartTooltip, GRID } from '@/components/ChartCard';
import { EmptyState } from '@/components/EmptyState';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { PageHeader } from '@/layout/PageHeader';
import { cn } from '@/lib/cn';
import { formatCurrency, pluralize } from '@/lib/format';
import { tokens } from '@/lib/tokens';
import { addDays, format, startOfDay } from 'date-fns';
import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
  PERIODS,
  PREDICTIVE_DEALS,
  WIN_BUCKETS,
  type DealRiskPrediction,
  type ForecastPeriod,
} from './aiForecastData';

const expectedWon = (deal: DealRiskPrediction) => (deal.value * deal.predictedWinRate) / 100;

export function AIAnalyticsPage() {
  const [period, setPeriod] = useState<ForecastPeriod>('quarter');
  const config = PERIODS[period];
  const today = useMemo(() => startOfDay(new Date()), []);

  const { deals, forecastWon, health, atRisk, distribution, timeline } = useMemo(() => {
    const inWindow = PREDICTIVE_DEALS.filter((d) => d.closesInDays < config.windowDays).sort(
      (a, b) => a.closesInDays - b.closesInDays,
    );
    const totalValue = inWindow.reduce((sum, d) => sum + d.value, 0);
    const won = inWindow.reduce((sum, d) => sum + expectedWon(d), 0);
    const risky = inWindow.filter((d) => d.predictedWinRate < 40);

    const buckets = Math.ceil(config.windowDays / config.bucketDays);
    return {
      deals: inWindow,
      forecastWon: won,
      // Value-weighted average win probability: big deals move the score more.
      health: totalValue === 0 ? null : (won / totalValue) * 100,
      atRisk: { value: risky.reduce((sum, d) => sum + d.value, 0), count: risky.length },
      distribution: WIN_BUCKETS.map((bucket, index) => {
        const ceiling = index === 0 ? Infinity : WIN_BUCKETS[index - 1].min;
        const members = inWindow.filter((d) => d.predictedWinRate >= bucket.min && d.predictedWinRate < ceiling);
        return {
          bucket: bucket.bucket,
          color: bucket.color,
          count: members.length,
          value: members.reduce((sum, d) => sum + d.value, 0),
        };
      }),
      timeline: Array.from({ length: buckets }, (_, i) => {
        const from = i * config.bucketDays;
        const to = Math.min(from + config.bucketDays, config.windowDays);
        const members = inWindow.filter((d) => d.closesInDays >= from && d.closesInDays < to);
        return {
          label: format(addDays(today, from), config.bucketFormat),
          forecast: members.reduce((sum, d) => sum + expectedWon(d), 0),
          count: members.length,
        };
      }),
    };
  }, [config, today]);

  const handleAction = (item: DealRiskPrediction) => {
    toast.success(`Action initiated: "${item.recommendedAction}"`);
  };

  const columns: Column<DealRiskPrediction>[] = [
    {
      id: 'deal',
      header: 'Deal & Customer',
      cell: (d) => (
        <div className="flex flex-col">
          <span className="font-semibold text-ink-900">{d.dealTitle}</span>
          <span className="text-xs text-ink-500">{d.customerName}</span>
        </div>
      ),
    },
    {
      id: 'value',
      header: 'Value',
      align: 'right',
      cell: (d) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(d.value, 'USD')}
        </span>
      ),
    },
    {
      id: 'closes',
      header: 'Expected Close',
      cell: (d) => (
        <div className="flex flex-col">
          <span className="tnum text-xs text-ink-900">{format(addDays(today, d.closesInDays), 'd MMM')}</span>
          <span className="text-2xs text-ink-300">
            {d.closesInDays === 0 ? 'today' : `in ${pluralize(d.closesInDays, 'day')}`}
          </span>
        </div>
      ),
    },
    {
      id: 'winRate',
      header: 'AI Win Probability',
      cell: (d) => {
        const isHigh = d.predictedWinRate >= 70;
        const isLow = d.predictedWinRate < 50;
        return (
          <div className="flex w-32 flex-col gap-1">
            <div className="flex justify-between text-xs font-mono font-medium">
              <span className={isLow ? 'text-danger-600' : isHigh ? 'text-emerald-600' : 'text-amber-600'}>
                {d.predictedWinRate}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-sunken">
              <div
                className={`h-1.5 rounded-full ${
                  isLow ? 'bg-danger-500' : isHigh ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${d.predictedWinRate}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      id: 'riskFactor',
      header: 'Primary Churn Risk Factor',
      cell: (d) => (
        <div className="flex flex-col text-xs max-w-xs">
          <span className="text-ink-700">{d.riskFactor}</span>
        </div>
      ),
    },
    {
      id: 'urgency',
      header: 'Risk Level',
      cell: (d) => (
        <Tag tone={d.urgency === 'high' ? 'danger' : d.urgency === 'medium' ? 'warn' : 'success'}>
          {d.urgency.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'action',
      header: 'AI Intervention',
      align: 'right',
      cell: (d) => (
        <Button size="sm" variant="secondary" onClick={() => handleAction(d)}>
          Execute Playbook
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="AI Predictive Analytics & Forecasting"
        meta="Machine-learned pipeline win rates, churn risk factors, and automated playbook interventions"
        actions={<PeriodSwitch value={period} onChange={setPeriod} />}
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Predicted Closed Won · {config.label}</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {formatCurrency(Math.round(forecastWon), 'USD')}
            </p>
            <span className="text-xs text-ink-400 font-mono">± {config.forecastMargin}% forecast margin</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Pipeline Health</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">
              {health === null ? '—' : `${health.toFixed(1)} / 100`}
            </p>
            <span className="text-xs text-ink-400">
              {pluralize(deals.length, 'deal')} closing {config.phrase}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Identified Deals At Risk</span>
            <p className="mt-1 font-mono text-2xl font-bold text-danger-600">
              {formatCurrency(atRisk.value, 'USD')}
            </p>
            <span className="text-xs text-ink-400">
              {atRisk.count === 0 ? 'Nothing under 40% win probability' : `${pluralize(atRisk.count, 'opportunity', 'opportunities')} under 40%`}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Model Accuracy Score</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              91.8%
            </p>
            <span className="text-xs text-ink-400">Trained on 48 closed quarters</span>
          </CardBody>
        </Card>
      </div>

      <ChartCard
        title={`Forecast timeline · ${config.label}`}
        caption={`Expected won revenue (deal value × win probability) by ${config.bucketLabel.toLowerCase()}, ${config.phrase}.`}
        columns={[config.bucketLabel, 'Deals', 'Expected won']}
        rows={timeline.map((row) => [row.label, row.count, formatCurrency(Math.round(row.forecast), 'USD')])}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={timeline} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="" />
            <XAxis dataKey="label" tick={AXIS_TEXT} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis
              tick={AXIS_TEXT}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrency(v, 'USD', { compact: true })}
            />
            <Tooltip
              cursor={{ fill: tokens.surface.sunken }}
              content={({ active, label, payload }) => (
                <ChartTooltip
                  active={active}
                  label={`${config.bucketLabel} ${label}`}
                  rows={
                    payload?.[0]
                      ? [
                          {
                            key: 'forecast',
                            label: 'Expected won',
                            value: formatCurrency(Math.round(Number(payload[0].value)), 'USD'),
                            color: tokens.ink[500],
                          },
                          { key: 'count', label: 'Deals', value: String(payload[0].payload.count) },
                        ]
                      : []
                  }
                />
              )}
            />
            <Bar dataKey="forecast" fill={tokens.ink[500]} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Pipeline Value Distribution by Predicted Win Probability"
        subtitle={`Deals closing ${config.phrase}, categorized by machine-learned probability of reaching Closed Won`}
        columns={['Probability', 'Deals', 'Value']}
        rows={distribution.map((row) => [row.bucket, row.count, formatCurrency(row.value, 'USD')])}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value, 'USD'), 'Pipeline Value']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <Card>
        <CardHeader
          title="Predictive Churn & Stalled Deal Analysis"
          description="High-value active opportunities showing elevated abandonment risk based on velocity decay and engagement drop."
        />
        {deals.length === 0 ? (
          <EmptyState title={`No deals closing ${config.phrase}`} description="Pick a longer window to see more of the pipeline." />
        ) : (
          <Table columns={columns} data={deals} keyField="id" />
        )}
      </Card>
    </div>
  );
}

function PeriodSwitch({ value, onChange }: { value: ForecastPeriod; onChange: (period: ForecastPeriod) => void }) {
  return (
    <div className="flex gap-0.5 rounded bg-surface-sunken p-0.5" role="group" aria-label="Forecast window">
      {(Object.keys(PERIODS) as ForecastPeriod[]).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider motion-safe:transition-colors',
            value === option ? 'bg-surface-card text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900',
          )}
        >
          {PERIODS[option].label}
        </button>
      ))}
    </div>
  );
}
