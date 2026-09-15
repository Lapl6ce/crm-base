import { Card, CardBody, CardHeader } from '@/components/Card';
import { ChartCard } from '@/components/ChartCard';
import { Table, type Column } from '@/components/Table';
import { initialPurchases } from '@/data/datasets';
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

interface VendorSpend {
  id: string;
  vendorName: string;
  orderCount: number;
  totalSpend: number;
  pctOfTotal: number;
}

const MONTHLY_PURCHASE_DATA = [
  { month: 'Apr', spend: 32000, orders: 4 },
  { month: 'May', spend: 48000, orders: 7 },
  { month: 'Jun', spend: 41000, orders: 5 },
  { month: 'Jul', spend: 52000, orders: 8 },
  { month: 'Aug', spend: 68000, orders: 11 },
  { month: 'Sep', spend: 59000, orders: 9 },
];

export function PurchaseReportsPage() {
  const totalSpend = initialPurchases.reduce((acc, p) => acc + p.total, 0);

  // Group by vendor
  const vendorMap = new Map<string, { count: number; spend: number }>();
  for (const po of initialPurchases) {
    const existing = vendorMap.get(po.supplierName) ?? { count: 0, spend: 0 };
    vendorMap.set(po.supplierName, {
      count: existing.count + 1,
      spend: existing.spend + po.total,
    });
  }

  const vendorSpends: VendorSpend[] = Array.from(vendorMap.entries()).map(([vendor, data], idx) => ({
    id: `v_${idx}`,
    vendorName: vendor,
    orderCount: data.count,
    totalSpend: data.spend,
    pctOfTotal: totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0,
  })).sort((a, b) => b.totalSpend - a.totalSpend);

  const topVendor = vendorSpends[0];
  const topVendorConcentration = topVendor ? topVendor.pctOfTotal.toFixed(1) : '0';

  const columns: Column<VendorSpend>[] = [
    {
      id: 'vendor',
      header: 'Supplier / Vendor',
      cell: (v) => <span className="font-semibold text-ink-900">{v.vendorName}</span>,
    },
    {
      id: 'orders',
      header: 'Purchase Orders',
      align: 'right',
      cell: (v) => <span className="font-mono text-xs text-ink-600">{v.orderCount}</span>,
    },
    {
      id: 'spend',
      header: 'Total Spend',
      align: 'right',
      cell: (v) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(v.totalSpend, 'USD')}
        </span>
      ),
    },
    {
      id: 'pct',
      header: 'Share of Procurement',
      cell: (v) => (
        <div className="flex w-36 items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-surface-sunken">
            <div
              className="h-1.5 rounded-full bg-accent-500"
              style={{ width: `${v.pctOfTotal}%` }}
            />
          </div>
          <span className="font-mono text-xs text-ink-600">{v.pctOfTotal.toFixed(1)}%</span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Procurement & Purchase Spend Reports"
        meta="Vendor concentration analysis, PO spend velocity, and procurement budget distribution"
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Total Purchase Volume</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalSpend, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Total POs Issued</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {initialPurchases.length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Top Vendor Concentration</span>
            <p className="mt-1 font-mono text-2xl font-bold text-amber-600">
              {topVendorConcentration}%
            </p>
            <span className="text-xs text-ink-400">{topVendor?.vendorName}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Active Vendor Base</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {vendorSpends.length} vendors
            </p>
          </CardBody>
        </Card>
      </div>

      <ChartCard
        title="Monthly Procurement Spend Trend"
        subtitle="Total dollar volume committed across supplier purchase orders by month"
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_PURCHASE_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value, 'USD'), 'Spend']} />
              <Bar dataKey="spend" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <Card>
        <CardHeader
          title="Procurement Spend Distribution by Vendor"
          description="Cumulative vendor billings and allocation percentage of total materials spend."
        />
        <Table columns={columns} data={vendorSpends} keyField="id" />
      </Card>
    </div>
  );
}
