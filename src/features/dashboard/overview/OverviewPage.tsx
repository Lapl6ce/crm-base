import { Card, CardHeader } from '@/components/Card';
import { IconArrowRight } from '@/components/icons';
import {
  initialExpenses,
  initialOrders,
  initialPayables,
  initialPayments,
  initialProducts,
  initialPurchases,
  initialQuotations,
  initialReceivables,
  initialSales,
  initialShipments,
  initialWarehouses,
} from '@/data/datasets';
import type {
  Expense,
  Order,
  Payable,
  Payment,
  Product,
  Purchase,
  Quotation,
  Receivable,
  Sale,
  Shipment,
  Team,
  Warehouse,
} from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { cn } from '@/lib/cn';
import { formatCurrency, pluralize } from '@/lib/format';
import { onTeam, teamLabel, TEAMS } from '@/lib/teams';
import { Link } from 'react-router-dom';

/* One screen that answers "how is the business doing?" for every team.
 *
 * It reads the same local collections the module pages edit, under the same
 * keys, so a change made on Sales or Payables shows up here without a refresh.
 * Each team gets one panel, and a user on a team sees only their own panel —
 * the same scoping the sidebar applies (lib/teams.ts). */

interface Metric {
  label: string;
  value: string;
  hint: string;
  to: string;
  tone?: 'positive' | 'accent';
}

const sum = <T,>(items: T[], pick: (item: T) => number) => items.reduce((total, item) => total + pick(item), 0);
const usd = (value: number) => formatCurrency(value, 'USD', { compact: true });

export function OverviewPage() {
  const { user } = useSession();

  const sales = useLocalCollection<Sale>({ collectionKey: 'sales', initialData: initialSales }).allItems;
  const quotations = useLocalCollection<Quotation>({ collectionKey: 'quotations', initialData: initialQuotations }).allItems;
  const orders = useLocalCollection<Order>({ collectionKey: 'orders', initialData: initialOrders }).allItems;
  const products = useLocalCollection<Product>({ collectionKey: 'products', initialData: initialProducts }).allItems;
  const purchases = useLocalCollection<Purchase>({ collectionKey: 'purchases', initialData: initialPurchases }).allItems;
  const shipments = useLocalCollection<Shipment>({ collectionKey: 'shipments', initialData: initialShipments }).allItems;
  const warehouses = useLocalCollection<Warehouse>({ collectionKey: 'warehouses', initialData: initialWarehouses }).allItems;
  const payments = useLocalCollection<Payment>({ collectionKey: 'payments', initialData: initialPayments }).allItems;
  const expenses = useLocalCollection<Expense>({ collectionKey: 'expenses', initialData: initialExpenses }).allItems;
  const receivables = useLocalCollection<Receivable>({ collectionKey: 'receivables', initialData: initialReceivables }).allItems;
  const payables = useLocalCollection<Payable>({ collectionKey: 'payables', initialData: initialPayables }).allItems;

  /* --- sales ------------------------------------------------------------- */
  const booked = sales.filter((s) => s.status === 'completed' || s.status === 'paid');
  const revenue = sum(booked, (s) => s.total);
  const openQuotes = quotations.filter((q) => q.status === 'draft' || q.status === 'sent');
  const salesOrdersInFlight = orders.filter(
    (o) => o.type === 'sales' && (o.fulfillmentStatus === 'pending' || o.fulfillmentStatus === 'processing'),
  );
  const byCustomer = new Map<string, number>();
  for (const sale of booked) byCustomer.set(sale.customerName, (byCustomer.get(sale.customerName) ?? 0) + sale.total);
  const [topCustomer, topCustomerRevenue] = [...byCustomer.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

  /* --- operations -------------------------------------------------------- */
  const stockAlerts = products.filter((p) => p.status === 'low_stock' || p.status === 'out_of_stock');
  const outOfStock = stockAlerts.filter((p) => p.status === 'out_of_stock').length;
  const inTransit = shipments.filter((s) => s.status === 'in_transit' || s.status === 'out_for_delivery');
  const troubled = shipments.filter(
    (s) => s.status === 'delayed' || s.status === 'exception' || s.status === 'customs_hold',
  );
  const openPOs = purchases.filter((p) => p.status === 'ordered' || p.status === 'partially_received');
  const capacity = sum(warehouses, (w) => w.capacityUnits);
  const utilization = capacity === 0 ? 0 : Math.round((sum(warehouses, (w) => w.utilizedUnits) / capacity) * 100);

  /* --- finance ----------------------------------------------------------- */
  const owedToUs = receivables.filter((r) => r.status !== 'paid' && r.status !== 'collected');
  const overdueReceivable = sum(owedToUs.filter((r) => r.status === 'overdue'), (r) => r.amount);
  const weOwe = payables.filter((p) => p.status !== 'paid');
  const overduePayables = weOwe.filter((p) => p.status === 'overdue').length;
  const settled = payments.filter((p) => p.status === 'completed');
  const netCash = sum(settled, (p) => (p.type === 'inbound' ? p.amount : -p.amount));
  const pendingExpenses = expenses.filter((e) => e.status === 'pending');

  const panels: Record<Exclude<Team, 'management'>, Metric[]> = {
    sales: [
      { label: 'Revenue booked', value: usd(revenue), hint: `${pluralize(booked.length, 'completed sale')}`, to: '/commerce/sales', tone: 'positive' },
      { label: 'Open quotations', value: usd(sum(openQuotes, (q) => q.total)), hint: `${pluralize(openQuotes.length, 'quote')} draft or sent`, to: '/commerce/quotations' },
      { label: 'Sales orders in progress', value: String(salesOrdersInFlight.length), hint: 'Pending or processing', to: '/commerce/orders' },
      { label: 'Top customer', value: topCustomer, hint: `${usd(topCustomerRevenue)} booked`, to: '/crm/customers' },
    ],
    operations: [
      { label: 'Stock alerts', value: String(stockAlerts.length), hint: `${outOfStock} out of stock`, to: '/operations/inventory-intelligence', tone: stockAlerts.length > 0 ? 'accent' : undefined },
      { label: 'Shipments needing attention', value: String(troubled.length), hint: `${inTransit.length} on the way`, to: '/operations/shipments', tone: troubled.length > 0 ? 'accent' : undefined },
      { label: 'Open purchase orders', value: String(openPOs.length), hint: `${usd(sum(openPOs, (p) => p.total))} on order`, to: '/commerce/purchases' },
      { label: 'Warehouse utilization', value: `${utilization}%`, hint: `across ${pluralize(warehouses.length, 'site')}`, to: '/operations/warehouses' },
    ],
    finance: [
      { label: 'Owed to us', value: usd(sum(owedToUs, (r) => r.amount)), hint: `${usd(overdueReceivable)} overdue`, to: '/finance/receivables', tone: overdueReceivable > 0 ? 'accent' : undefined },
      { label: 'We owe', value: usd(sum(weOwe, (p) => p.amount)), hint: `${pluralize(overduePayables, 'bill')} overdue`, to: '/finance/payables' },
      { label: 'Net cash from payments', value: usd(netCash), hint: `${pluralize(settled.length, 'settled payment')}`, to: '/finance/payments', tone: netCash >= 0 ? 'positive' : 'accent' },
      { label: 'Expenses awaiting approval', value: String(pendingExpenses.length), hint: usd(sum(pendingExpenses, (e) => e.amount)), to: '/finance/expenses' },
    ],
  };

  const visibleTeams = TEAMS.filter((team) => team.value !== 'management' && onTeam(user, [team.value]));
  const scopedTo = user?.role !== 'admin' && user?.team && user.team !== 'management' ? user.team : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Business Overview"
        meta={scopedTo ? `${teamLabel[scopedTo]} team view` : 'All teams'}
        description="Where each team stands right now, from the records in their modules. Every figure links to the screen it was counted from."
      />

      {visibleTeams.map((team) => (
        <Card key={team.value}>
          <CardHeader title={team.label} description={team.description} />
          <div className="grid grid-cols-1 divide-y divide-ink-100 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
            {panels[team.value as Exclude<Team, 'management'>].map((metric) => (
              <MetricTile key={metric.label} metric={metric} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function MetricTile({ metric }: { metric: Metric }) {
  return (
    <Link
      to={metric.to}
      className="group flex flex-col gap-1 p-4 motion-safe:transition-colors hover:bg-surface-sunken/50"
    >
      <span className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wide text-ink-300">
        {metric.label}
        <IconArrowRight size={14} className="opacity-0 motion-safe:transition-opacity group-hover:opacity-100" />
      </span>
      <span
        className={cn(
          'tnum truncate font-display text-xl font-semibold',
          metric.tone === 'positive' ? 'text-positive-600' : metric.tone === 'accent' ? 'text-accent-600' : 'text-ink-900',
        )}
      >
        {metric.value}
      </span>
      <span className="text-xs text-ink-500">{metric.hint}</span>
    </Link>
  );
}
