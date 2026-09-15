import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ChartCard } from '@/components/ChartCard';
import { Field, Select } from '@/components/Field';
import { Table, type Column } from '@/components/Table';
import { toast } from '@/components/Toast';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/lib/format';
import { useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface CustomDataRow {
  id: string;
  dimension: string;
  metricValue: number;
  recordsCount: number;
  sharePct: number;
}

const CATEGORY_DATA: CustomDataRow[] = [
  { id: '1', dimension: 'Hardware Gateways', metricValue: 245000, recordsCount: 18, sharePct: 44.5 },
  { id: '2', dimension: 'Networking Routers', metricValue: 142000, recordsCount: 12, sharePct: 25.8 },
  { id: '3', dimension: 'Sensor Peripherals', metricValue: 89000, recordsCount: 22, sharePct: 16.2 },
  { id: '4', dimension: 'Software & SLA', metricValue: 74000, recordsCount: 9, sharePct: 13.5 },
];

const CUSTOMER_DATA: CustomDataRow[] = [
  { id: '1', dimension: 'Vertex Global Systems', metricValue: 165000, recordsCount: 8, sharePct: 30.0 },
  { id: '2', dimension: 'Nexus Biomed Technologies', metricValue: 94000, recordsCount: 5, sharePct: 17.1 },
  { id: '3', dimension: 'Borealis Genomics', metricValue: 82000, recordsCount: 4, sharePct: 14.9 },
  { id: '4', dimension: 'Solaris Clean Energy', metricValue: 51000, recordsCount: 3, sharePct: 9.3 },
  { id: '5', dimension: 'Kinetic Automation Corp', metricValue: 38000, recordsCount: 2, sharePct: 6.9 },
  { id: '6', dimension: 'Other Accounts', metricValue: 120000, recordsCount: 14, sharePct: 21.8 },
];

const OWNER_DATA: CustomDataRow[] = [
  { id: '1', dimension: 'Alex Chen (Enterprise AE)', metricValue: 290000, recordsCount: 15, sharePct: 52.7 },
  { id: '2', dimension: 'Sarah Jenkins (Solutions Architect)', metricValue: 180000, recordsCount: 11, sharePct: 32.7 },
  { id: '3', dimension: 'David Kim (Commercial Lead)', metricValue: 80000, recordsCount: 6, sharePct: 14.6 },
];

export function CustomReportsPage() {
  const [metric, setMetric] = useState<'revenue' | 'units' | 'margin'>('revenue');
  const [dimension, setDimension] = useState<'category' | 'customer' | 'owner'>('category');
  const [timeRange, setTimeRange] = useState('quarter');

  const getDataset = (): CustomDataRow[] => {
    if (dimension === 'customer') return CUSTOMER_DATA;
    if (dimension === 'owner') return OWNER_DATA;
    return CATEGORY_DATA;
  };

  const dataset = getDataset();
  const totalMetric = dataset.reduce((acc, r) => acc + r.metricValue, 0);

  const handleExportCsv = () => {
    const csvContent = [
      ['Dimension', 'Metric Value', 'Records Count', 'Share %'].join(','),
      ...dataset.map((r) => [r.dimension, r.metricValue, r.recordsCount, `${r.sharePct}%`].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-report-${dimension}-${metric}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Custom report exported to CSV');
  };

  const columns: Column<CustomDataRow>[] = [
    {
      id: 'dimension',
      header: dimension === 'customer' ? 'Customer Account' : dimension === 'owner' ? 'Sales Owner' : 'Product Category',
      cell: (r) => <span className="font-semibold text-ink-900">{r.dimension}</span>,
    },
    {
      id: 'records',
      header: 'Events / Orders',
      align: 'right',
      cell: (r) => <span className="font-mono text-xs text-ink-600">{r.recordsCount}</span>,
    },
    {
      id: 'value',
      header: metric === 'revenue' ? 'Total Revenue' : metric === 'margin' ? 'Gross Margin' : 'Units',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(r.metricValue, 'USD')}
        </span>
      ),
    },
    {
      id: 'share',
      header: 'Relative Share',
      cell: (r) => (
        <div className="flex w-36 items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-surface-sunken">
            <div
              className="h-1.5 rounded-full bg-accent-500"
              style={{ width: `${r.sharePct}%` }}
            />
          </div>
          <span className="font-mono text-xs text-ink-600">{r.sharePct.toFixed(1)}%</span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Custom Report Builder"
        meta="Ad-hoc multi-dimensional reporting across sales, customers, catalog, and reps"
        actions={
          <Button variant="secondary" onClick={handleExportCsv}>
            Export to CSV
          </Button>
        }
      />

      {/* Builder Filter Bar */}
      <Card>
        <CardBody className="py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Primary Metric">
              {({ id }) => (
                <Select
                  id={id}
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as typeof metric)}
                  options={[
                    { value: 'revenue', label: 'Recognized Revenue ($)' },
                    { value: 'margin', label: 'Gross Margin Yield ($)' },
                    { value: 'units', label: 'Units Delivered' },
                  ]}
                />
              )}
            </Field>

            <Field label="Group By Dimension">
              {({ id }) => (
                <Select
                  id={id}
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value as typeof dimension)}
                  options={[
                    { value: 'category', label: 'Product Category' },
                    { value: 'customer', label: 'Customer Account' },
                    { value: 'owner', label: 'Sales Owner / Rep' },
                  ]}
                />
              )}
            </Field>

            <Field label="Date Range Window">
              {({ id }) => (
                <Select
                  id={id}
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  options={[
                    { value: 'month', label: 'Last 30 Days' },
                    { value: 'quarter', label: 'Current Quarter (Q3 2024)' },
                    { value: 'ytd', label: 'Year to Date (YTD)' },
                    { value: 'all', label: 'All Recorded Data' },
                  ]}
                />
              )}
            </Field>
          </div>
        </CardBody>
      </Card>

      <ChartCard
        title={`Custom Breakdown: ${dimension.toUpperCase()} by ${metric.toUpperCase()}`}
        subtitle={`Total aggregation: ${formatCurrency(totalMetric, 'USD')} across ${dataset.length} groups`}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataset} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="dimension" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value, 'USD'), 'Value']} />
              <Bar dataKey="metricValue" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <Card>
        <CardHeader
          title="Aggregated Results Table"
          description="Detailed figures matching builder dimensions. Click Export to download."
        />
        <Table columns={columns} data={dataset} keyField="id" />
      </Card>
    </div>
  );
}

