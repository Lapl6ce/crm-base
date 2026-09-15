import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { HeatLabel } from '@/components/HeatStripe';
import { RecordRow } from '@/components/RecordRow';
import { Skeleton } from '@/components/Skeleton';
import { Tag } from '@/components/Tag';
import { IconAlert, IconCheckCircle, IconPlus } from '@/components/icons';
import { useData } from '@/data/DataProvider';
import { initialProducts, initialReceivables } from '@/data/datasets';
import { useAnalytics } from '@/data/useAnalytics';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/format';
import { dealHeat, taskHeat } from '@/lib/heat';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function ActionCenterPage() {
  const navigate = useNavigate();
  const provider = useData();
  const { user, stages } = useSession();
  const { derived, loading, error, refresh } = useAnalytics();
  const [filterTab, setFilterTab] = useState<'all' | 'deals' | 'tasks' | 'alerts'>('all');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  if (loading) return <ActionCenterSkeleton />;
  if (error) return <ErrorState description={error.message} onRetry={refresh} />;
  if (!derived) return null;

  const { raw } = derived;

  // Deals needing attention sorted by heat (highest urgency first)
  const urgentDeals = raw.deals
    .filter((d) => d.status === 'open')
    .map((deal) => ({ deal, heat: dealHeat(deal) }))
    .sort((a, b) => b.heat.scalar - a.heat.scalar);

  // Tasks due or overdue
  const pendingTasks = raw.tasks
    .filter((t) => !t.completed)
    .map((task) => ({ task, heat: taskHeat(task) }))
    .sort((a, b) => b.heat.scalar - a.heat.scalar);

  // Low stock inventory alerts
  const inventoryAlerts = initialProducts.filter(
    (p) => p.status === 'low_stock' || p.status === 'out_of_stock',
  );

  // Overdue receivables alerts
  const overdueReceivables = initialReceivables.filter((r) => r.status === 'overdue');

  const totalActionsCount =
    urgentDeals.length + pendingTasks.length + inventoryAlerts.length + overdueReceivables.length;

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    if (!user) return;
    try {
      setCompletingTaskId(taskId);
      await provider.tasks.setCompleted(taskId, !currentStatus, user.id);
      refresh();
    } finally {
      setCompletingTaskId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Action Center"
        description="Unified operational priority queue: unresponsive deals, impending tasks, stockouts, and overdue balances."
        actions={
          <Button variant="primary" onClick={() => navigate('/crm/pipeline-deals')}>
            <IconPlus size={16} /> New Deal
          </Button>
        }
      />

      {/* Summary Alert Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent-500/20 bg-accent-100/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-white">
            <IconAlert size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink-900">
              {totalActionsCount} Critical Items Require Attention
            </h2>
            <p className="text-xs text-ink-500">
              Immediate triage prevents pipeline stagnation and supply chain delivery bottlenecks.
            </p>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex rounded bg-surface-sunken p-0.5">
          {(
            [
              { id: 'all', label: `All (${totalActionsCount})` },
              { id: 'deals', label: `Deals (${urgentDeals.length})` },
              { id: 'tasks', label: `Tasks (${pendingTasks.length})` },
              { id: 'alerts', label: `System Alerts (${inventoryAlerts.length + overdueReceivables.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterTab === tab.id
                  ? 'bg-surface-card text-ink-900 shadow-sm'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Urgent Deals Queue */}
        {(filterTab === 'all' || filterTab === 'deals') && (
          <Card className={filterTab === 'deals' ? 'lg:col-span-3' : 'lg:col-span-2'}>
            <CardHeader
              title="Stale & High-Urgency Deals"
              action={
                <Link to="/crm/pipeline-deals" className="text-xs font-medium text-ink-500 hover:text-ink-900">
                  Open Board
                </Link>
              }
            />
            {urgentDeals.length === 0 ? (
              <CardBody>
                <EmptyState
                  size="sm"
                  title="No deals needing urgent attention"
                  description="All open deals have recent activity."
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {urgentDeals.slice(0, 8).map(({ deal, heat }) => (
                  <li key={deal.id}>
                    <RecordRow
                      to={`/crm/pipeline-deals/${deal.id}`}
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
        )}

        {/* Due & Overdue Tasks Queue */}
        {(filterTab === 'all' || filterTab === 'tasks') && (
          <Card className={filterTab === 'tasks' ? 'lg:col-span-3' : 'lg:col-span-1'}>
            <CardHeader
              title="Pending Tasks Queue"
              action={
                <span className="text-2xs font-semibold uppercase tracking-wider text-ink-300">
                  {pendingTasks.length} OPEN
                </span>
              }
            />
            {pendingTasks.length === 0 ? (
              <CardBody>
                <EmptyState size="sm" title="All caught up!" description="No pending tasks are scheduled." />
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {pendingTasks.slice(0, 8).map(({ task, heat }) => (
                  <li key={task.id} className="flex items-center gap-3 p-3 hover:bg-surface-sunken/40">
                    <button
                      type="button"
                      disabled={completingTaskId === task.id}
                      onClick={() => handleToggleTask(task.id, task.completed)}
                      className="text-ink-300 transition-colors hover:text-positive-600 focus:outline-none"
                      title="Mark as completed"
                    >
                      <IconCheckCircle size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{task.title}</p>
                      <p className="text-2xs text-ink-500">
                        {task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}
                      </p>
                    </div>
                    <HeatLabel heat={heat} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* Operational & Financial Alerts */}
        {(filterTab === 'all' || filterTab === 'alerts') && (
          <Card className="lg:col-span-3">
            <CardHeader
              title="Operational & Financial Warnings"
              action={
                <div className="flex gap-2 text-xs">
                  <Link to="/commerce/products" className="text-ink-500 hover:text-ink-900">
                    Products
                  </Link>
                  <span className="text-ink-300">·</span>
                  <Link to="/finance/receivables" className="text-ink-500 hover:text-ink-900">
                    Receivables
                  </Link>
                </div>
              }
            />
            <CardBody className="p-0">
              <div className="grid grid-cols-1 divide-y divide-ink-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                {/* Low Stock Items */}
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                      Inventory Depletion Alerts
                    </h3>
                    <Tag tone="danger">{inventoryAlerts.length} Critical</Tag>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {inventoryAlerts.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between rounded border border-ink-100 p-2.5 text-xs hover:border-ink-150"
                      >
                        <div>
                          <p className="font-semibold text-ink-900">{item.name}</p>
                          <p className="text-2xs text-ink-500">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-danger-600">
                            {item.stock} on hand
                          </span>
                          <p className="text-2xs text-ink-300">Min: {item.minStockLevel}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Overdue Receivables */}
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                      Past-Due Accounts Receivable
                    </h3>
                    <Tag tone="warn">{overdueReceivables.length} Overdue</Tag>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {overdueReceivables.map((rec) => (
                      <li
                        key={rec.id}
                        className="flex items-center justify-between rounded border border-ink-100 p-2.5 text-xs hover:border-ink-150"
                      >
                        <div>
                          <p className="font-semibold text-ink-900">{rec.debtorName}</p>
                          <p className="text-2xs text-ink-500">{rec.invoiceNumber}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-ink-900">
                            {formatCurrency(rec.amount, rec.currency)}
                          </span>
                          <p className="text-2xs font-semibold text-warn-500">Bucket: {rec.agingBucket}d</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function ActionCenterSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 rounded-card" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-card lg:col-span-2" />
        <Skeleton className="h-80 rounded-card lg:col-span-1" />
      </div>
    </div>
  );
}
