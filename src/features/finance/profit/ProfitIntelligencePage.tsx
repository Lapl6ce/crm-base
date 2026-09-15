import { Card, CardBody, CardHeader } from '@/components/Card';
import { ChartCard } from '@/components/ChartCard';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { initialExpenses, initialProducts, initialSales } from '@/data/datasets';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/lib/format';
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

interface CategoryMargin {
  id: string;
  category: string;
  itemsCount: number;
  avgPrice: number;
  avgCost: number;
  grossMarginPct: number;
  status: 'high_yield' | 'healthy' | 'tight';
}

const MONTHLY_PROFIT_DATA = [
  { month: 'Apr', revenue: 42000, cogs: 21500, opex: 9500, netProfit: 11000 },
  { month: 'May', revenue: 56000, cogs: 28000, opex: 10200, netProfit: 17800 },
  { month: 'Jun', revenue: 64500, cogs: 31000, opex: 11400, netProfit: 22100 },
  { month: 'Jul', revenue: 58000, cogs: 29500, opex: 10800, netProfit: 17700 },
  { month: 'Aug', revenue: 78200, cogs: 37500, opex: 12100, netProfit: 28600 },
  { month: 'Sep', revenue: 91400, cogs: 42000, opex: 13500, netProfit: 35900 },
];

export function ProfitIntelligencePage() {
  const totalSales = initialSales.reduce((acc, s) => acc + s.total, 0);
  const totalExpenses = initialExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Group products by category to calculate unit profitability
  const categoryMap = new Map<string, { count: number; sumPrice: number; sumCost: number }>();
  for (const prod of initialProducts) {
    const existing = categoryMap.get(prod.category) ?? { count: 0, sumPrice: 0, sumCost: 0 };
    categoryMap.set(prod.category, {
      count: existing.count + 1,
      sumPrice: existing.sumPrice + prod.unitPrice,
      sumCost: existing.sumCost + prod.costPrice,
    });
  }

  const categoryMargins: CategoryMargin[] = Array.from(categoryMap.entries()).map(([cat, data], idx) => {
    const avgPrice = data.sumPrice / data.count;
    const avgCost = data.sumCost / data.count;
    const grossMarginPct = avgPrice > 0 ? ((avgPrice - avgCost) / avgPrice) * 100 : 0;
    let status: CategoryMargin['status'] = 'healthy';
    if (grossMarginPct >= 50) status = 'high_yield';
    else if (grossMarginPct < 30) status = 'tight';

    return {
      id: `cat_${idx}`,
      category: cat,
      itemsCount: data.count,
      avgPrice,
      avgCost,
      grossMarginPct,
      status,
    };
  });

  // Estimated gross profit & net profit
  const estimatedCOGS = totalSales * 0.48; // ~48% average hardware & fulfillment cost
  const grossProfit = totalSales - estimatedCOGS;
  const grossMarginPct = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
  const netProfit = grossProfit - totalExpenses;
  const netMarginPct = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  const columns: Column<CategoryMargin>[] = [
    {
      id: 'category',
      header: 'Product Category',
      cell: (c) => <span className="font-semibold text-ink-900">{c.category}</span>,
    },
    {
      id: 'items',
      header: 'SKUs in Catalog',
      align: 'right',
      cell: (c) => <span className="font-mono text-xs text-ink-600">{c.itemsCount}</span>,
    },
    {
      id: 'avgPrice',
      header: 'Avg Unit Price',
      align: 'right',
      cell: (c) => (
        <span className="font-mono text-xs text-ink-800">{formatCurrency(c.avgPrice, 'USD')}</span>
      ),
    },
    {
      id: 'avgCost',
      header: 'Avg Unit Cost',
      align: 'right',
      cell: (c) => (
        <span className="font-mono text-xs text-ink-500">{formatCurrency(c.avgCost, 'USD')}</span>
      ),
    },
    {
      id: 'margin',
      header: 'Gross Margin %',
      align: 'right',
      cell: (c) => (
        <span className="font-mono text-xs font-bold text-emerald-600">
          {c.grossMarginPct.toFixed(1)}%
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Margin Health',
      cell: (c) => {
        if (c.status === 'high_yield') return <Tag tone="success">HIGH YIELD (50%+)</Tag>;
        if (c.status === 'tight') return <Tag tone="warn">TIGHT MARGIN (&lt;30%)</Tag>;
        return <Tag tone="accent">HEALTHY</Tag>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Profit & Margin Intelligence"
        meta="Gross vs. Net margin analytics, COGS decomposition, product line yield"
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Gross Recognized Revenue</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalSales, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Gross Profit (COGS Deducted)</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {formatCurrency(grossProfit, 'USD')}
            </p>
            <span className="text-xs text-emerald-700 font-medium font-mono">{grossMarginPct.toFixed(1)}% gross margin</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Operating Expenses (OpEx)</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalExpenses, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Net Operating Profit</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-700">
              {formatCurrency(netProfit, 'USD')}
            </p>
            <span className="text-xs text-accent-800 font-medium font-mono">{netMarginPct.toFixed(1)}% net margin</span>
          </CardBody>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Revenue vs COGS vs Net Profit (Last 6 Months)"
          subtitle="Monthly cash trajectory and operating margin buffer"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_PROFIT_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value, 'USD'), '']} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0284c7" fillOpacity={1} fill="url(#revGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10b981" fillOpacity={1} fill="url(#profGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Category Margin Breakdown"
          subtitle="Average gross profit percentage by product vertical"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryMargins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Gross Margin']} />
                <Bar dataKey="grossMarginPct" name="Gross Margin %" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <Card>
        <CardHeader
          title="Product Line Profitability"
          description="Unit margin contribution analysis across active catalog categories."
        />
        <Table columns={columns} data={categoryMargins} keyField="id" />
      </Card>
    </div>
  );
}
