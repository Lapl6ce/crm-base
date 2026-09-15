import { Card, CardBody, CardHeader } from '@/components/Card';
import { ChartCard } from '@/components/ChartCard';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { initialSales } from '@/data/datasets';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/lib/format';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface CustomerLtvRecord {
  id: string;
  customerName: string;
  ordersCount: number;
  totalLtv: number;
  tier: 'Enterprise' | 'Growth' | 'Mid-Market';
  growthTrajectory: string;
}

const TOP_CUSTOMER_ACCOUNTS: CustomerLtvRecord[] = [
  {
    id: 'c_1',
    customerName: 'Vertex Global Systems',
    ordersCount: 8,
    totalLtv: 165000,
    tier: 'Enterprise',
    growthTrajectory: '+42% YoY',
  },
  {
    id: 'c_2',
    customerName: 'Nexus Biomed Technologies',
    ordersCount: 5,
    totalLtv: 94000,
    tier: 'Enterprise',
    growthTrajectory: '+18% YoY',
  },
  {
    id: 'c_3',
    customerName: 'Borealis Genomics',
    ordersCount: 4,
    totalLtv: 82000,
    tier: 'Growth',
    growthTrajectory: '+65% YoY',
  },
  {
    id: 'c_4',
    customerName: 'Solaris Clean Energy',
    ordersCount: 3,
    totalLtv: 51000,
    tier: 'Mid-Market',
    growthTrajectory: '+24% YoY',
  },
  {
    id: 'c_5',
    customerName: 'Kinetic Automation Corp',
    ordersCount: 2,
    totalLtv: 38000,
    tier: 'Mid-Market',
    growthTrajectory: 'New Account',
  },
];

const TIER_LTV_DATA = [
  { tier: 'Enterprise', avgLtv: 129500, customerCount: 4 },
  { tier: 'Growth', avgLtv: 82000, customerCount: 6 },
  { tier: 'Mid-Market', avgLtv: 44500, customerCount: 12 },
];

export function CustomerReportsPage() {
  const totalBilled = initialSales.reduce((acc, s) => acc + s.total, 0);
  const avgLtv = totalBilled / (TOP_CUSTOMER_ACCOUNTS.length || 1);

  const columns: Column<CustomerLtvRecord>[] = [
    {
      id: 'name',
      header: 'Customer Account',
      cell: (c) => <span className="font-semibold text-ink-900">{c.customerName}</span>,
    },
    {
      id: 'tier',
      header: 'Segment Tier',
      cell: (c) => (
        <Tag tone={c.tier === 'Enterprise' ? 'accent' : c.tier === 'Growth' ? 'success' : 'neutral'}>
          {c.tier}
        </Tag>
      ),
    },
    {
      id: 'orders',
      header: 'Completed Orders',
      align: 'right',
      cell: (c) => <span className="font-mono text-xs text-ink-600">{c.ordersCount}</span>,
    },
    {
      id: 'ltv',
      header: 'Lifetime Value (LTV)',
      align: 'right',
      cell: (c) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(c.totalLtv, 'USD')}
        </span>
      ),
    },
    {
      id: 'growth',
      header: 'Growth Trajectory',
      cell: (c) => (
        <span className="font-mono text-xs font-medium text-emerald-600">
          {c.growthTrajectory}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Customer Intelligence & LTV Reports"
        meta="Lifetime value (LTV), cohort retention metrics, and high-value B2B account expansion"
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Average Account LTV</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(avgLtv, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Net Revenue Retention (NRR)</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              118.4%
            </p>
            <span className="text-xs text-emerald-700 font-medium">+4.1% expansion</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Repeat Order Rate</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">
              72.0%
            </p>
            <span className="text-xs text-ink-400">High stickiness</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Key Enterprise Accounts</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {TOP_CUSTOMER_ACCOUNTS.length}
            </p>
          </CardBody>
        </Card>
      </div>

      <ChartCard
        title="Average Lifetime Value by Customer Tier"
        subtitle="Revenue contribution per account grouped by organizational segment"
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={TIER_LTV_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="tier" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value, 'USD'), 'Avg LTV']} />
              <Bar dataKey="avgLtv" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <Card>
        <CardHeader
          title="Top Customer Accounts & Cohort Trajectory"
          description="Key accounts driving recurring gross revenue and contract expansions."
        />
        <Table columns={columns} data={TOP_CUSTOMER_ACCOUNTS} keyField="id" />
      </Card>
    </div>
  );
}
