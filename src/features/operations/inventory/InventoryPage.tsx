import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input } from '@/components/Field';
import { IconPackage } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialProducts } from '@/data/datasets';
import type { Product } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, pluralize } from '@/lib/format';
import { useState } from 'react';

export function InventoryPage() {
  const {
    items: products,
    total,
    page,
    pageSize,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    update,
  } = useLocalCollection<Product>({
    collectionKey: 'products',
    initialData: initialProducts,
    defaultSort: { field: 'stockOnHand', dir: 'asc' },
  });

  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState('0');
  const [newReorder, setNewReorder] = useState('10');

  const openAdjust = (prod: Product) => {
    setAdjustTarget(prod);
    setNewStock(String(prod.stockOnHand));
    setNewReorder(String(prod.reorderPoint));
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    const parsedStock = parseInt(newStock, 10) || 0;
    const parsedReorder = parseInt(newReorder, 10) || 0;
    const status = parsedStock <= 0 ? 'out_of_stock' : 'active';

    await update(adjustTarget.id, {
      stockOnHand: parsedStock,
      reorderPoint: parsedReorder,
      status,
    });

    toast.success(`Inventory updated for ${adjustTarget.name}`);
    setAdjustTarget(null);
  };

  // Metrics
  const totalValuation = products.reduce((acc, p) => acc + p.stockOnHand * p.unitCost, 0);
  const totalUnits = products.reduce((acc, p) => acc + p.stockOnHand, 0);
  const criticalItems = products.filter((p) => p.stockOnHand <= p.reorderPoint);

  const columns: Column<Product>[] = [
    {
      id: 'sku',
      header: 'SKU',
      cell: (p) => <span className="font-mono text-xs font-semibold text-ink-700">{p.sku}</span>,
    },
    {
      id: 'name',
      header: 'Item & Category',
      cell: (p) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink-900">{p.name}</span>
          <span className="text-xs text-ink-500">{p.category}</span>
        </div>
      ),
    },
    {
      id: 'stock',
      header: 'Stock Levels',
      cell: (p) => {
        const pct = p.reorderPoint > 0 ? (p.stockOnHand / (p.reorderPoint * 2)) * 100 : 100;
        const isLow = p.stockOnHand <= p.reorderPoint;
        return (
          <div className="flex w-36 flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className={`font-mono font-semibold ${isLow ? 'text-danger-600' : 'text-ink-900'}`}>
                {p.stockOnHand} on hand
              </span>
              <span className="text-ink-400">min {p.reorderPoint}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-sunken">
              <div
                className={`h-1.5 rounded-full ${isLow ? 'bg-danger-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      id: 'health',
      header: 'Health Status',
      cell: (p) => {
        if (p.stockOnHand === 0) {
          return <Tag tone="danger">OUT OF STOCK</Tag>;
        }
        if (p.stockOnHand <= p.reorderPoint) {
          return <Tag tone="warn">REORDER SOON</Tag>;
        }
        return <Tag tone="success">OPTIMAL</Tag>;
      },
    },
    {
      id: 'cost',
      header: 'Unit Cost',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-xs text-ink-600">{formatCurrency(p.unitCost, 'USD')}</span>
      ),
    },
    {
      id: 'valuation',
      header: 'Total Value',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(p.stockOnHand * p.unitCost, 'USD')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (p) => (
        <Button size="sm" variant="secondary" onClick={() => openAdjust(p)}>
          Adjust Stock
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Inventory Intelligence"
        meta={`${pluralize(total, 'item')} tracked · ${formatCurrency(totalValuation, 'USD')} total asset value`}
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search inventory by SKU, product name…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <FilterSelect
                label="Category"
                allLabel="All categories"
                value={(filters.category as string) ?? ''}
                onChange={(val) => setFilter('category', val)}
                options={[
                  { value: 'Hardware', label: 'Hardware' },
                  { value: 'Networking', label: 'Networking' },
                  { value: 'Sensors', label: 'Sensors' },
                  { value: 'Software', label: 'Software' },
                  { value: 'Components', label: 'Components' },
                ]}
              />
            }
          />
        }
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Inventory Valuation</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalValuation, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Total Units Stored</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {totalUnits.toLocaleString()}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Items Needing Reorder</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${criticalItems.length > 0 ? 'text-danger-600' : 'text-ink-900'}`}>
              {criticalItems.length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Stock Health Index</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {total > 0 ? `${(((total - criticalItems.length) / total) * 100).toFixed(0)}%` : '100%'}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Stock Replenishment & Velocity Monitor"
          description="Automated threshold monitoring alerts when physical quantities approach safety stock limits."
        />
        {products.length === 0 ? (
          <EmptyState
            icon={<IconPackage size={32} />}
            title="No inventory records"
            description="All catalog items will automatically appear here with real-time stock velocity."
          />
        ) : (
          <>
            <Table columns={columns} data={products} keyField="id" />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Adjust Stock Drawer */}
      <Drawer
        open={Boolean(adjustTarget)}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust Stock: ${adjustTarget?.name}`}
        description={`SKU ${adjustTarget?.sku} · Category ${adjustTarget?.category}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="adjust-form">
              Save adjustment
            </Button>
          </>
        }
      >
        <form id="adjust-form" onSubmit={handleSaveAdjustment} className="flex flex-col gap-4">
          <Field label="Physical Stock on Hand" required hint="Current counted stock available for dispatch">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Reorder Threshold" required hint="Triggers replenishment warning when reached">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                value={newReorder}
                onChange={(e) => setNewReorder(e.target.value)}
                required
              />
            )}
          </Field>
        </form>
      </Drawer>
    </div>
  );
}
