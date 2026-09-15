import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { IconEdit, IconPackage, IconPlus, IconTrash } from '@/components/icons';
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

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  active: 'success',
  archived: 'neutral',
  out_of_stock: 'danger',
};

export function ProductsPage() {
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
    create,
    update,
    remove,
  } = useLocalCollection<Product>({
    collectionKey: 'products',
    initialData: initialProducts,
    defaultSort: { field: 'name', dir: 'asc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Form fields
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [unitPrice, setUnitPrice] = useState('0');
  const [unitCost, setUnitCost] = useState('0');
  const [stockOnHand, setStockOnHand] = useState('0');
  const [reorderPoint, setReorderPoint] = useState('10');
  const [status, setStatus] = useState<Product['status']>('active');

  const openCreate = () => {
    setEditingProduct(null);
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setDescription('');
    setCategory('Hardware');
    setUnitPrice('250.00');
    setUnitCost('150.00');
    setStockOnHand('50');
    setReorderPoint('15');
    setStatus('active');
    setDrawerOpen(true);
  };

  const openEdit = (prod: Product) => {
    setEditingProduct(prod);
    setSku(prod.sku);
    setName(prod.name);
    setDescription(prod.description || '');
    setCategory(prod.category);
    setUnitPrice(String(prod.unitPrice));
    setUnitCost(String(prod.unitCost));
    setStockOnHand(String(prod.stockOnHand));
    setReorderPoint(String(prod.reorderPoint));
    setStatus(prod.status);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      toast.error('SKU and Product Name are required');
      return;
    }

    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim(),
      unitPrice: parseFloat(unitPrice) || 0,
      unitCost: parseFloat(unitCost) || 0,
      stockOnHand: parseInt(stockOnHand, 10) || 0,
      reorderPoint: parseInt(reorderPoint, 10) || 0,
      status,
    };

    if (editingProduct) {
      await update(editingProduct.id, payload);
      toast.success(`${payload.name} updated`);
    } else {
      await create(payload);
      toast.success(`${payload.name} added to catalog`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`${deleteTarget.name} removed from catalog`);
    setDeleteTarget(null);
  };

  const lowStockCount = products.filter((p) => p.stockOnHand <= p.reorderPoint).length;
  const activeCount = products.filter((p) => p.status === 'active').length;

  const columns: Column<Product>[] = [
    {
      id: 'sku',
      header: 'SKU / Code',
      cell: (p) => <span className="font-mono text-xs font-semibold text-ink-700">{p.sku}</span>,
    },
    {
      id: 'name',
      header: 'Product Name',
      cell: (p) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink-900">{p.name}</span>
          <span className="text-xs text-ink-500">{p.category}</span>
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Unit Price',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-xs font-medium text-ink-900">
          {formatCurrency(p.unitPrice, 'USD')}
        </span>
      ),
    },
    {
      id: 'cost',
      header: 'Unit Cost',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-xs text-ink-500">
          {formatCurrency(p.unitCost, 'USD')}
        </span>
      ),
    },
    {
      id: 'margin',
      header: 'Margin %',
      align: 'right',
      cell: (p) => {
        const margin = p.unitPrice > 0 ? ((p.unitPrice - p.unitCost) / p.unitPrice) * 100 : 0;
        return (
          <span className="font-mono text-xs font-medium text-emerald-600">
            {margin.toFixed(1)}%
          </span>
        );
      },
    },
    {
      id: 'stock',
      header: 'Stock / Reorder',
      cell: (p) => {
        const isLow = p.stockOnHand <= p.reorderPoint;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono text-xs font-semibold ${
                isLow ? 'text-danger-600' : 'text-ink-900'
              }`}
            >
              {p.stockOnHand}
            </span>
            <span className="text-xs text-ink-400">/ {p.reorderPoint}</span>
            {isLow && (
              <span className="rounded bg-danger-100 px-1 text-[10px] font-bold text-danger-700">
                LOW
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: (p) => (
        <Tag tone={STATUS_TONES[p.status] ?? 'neutral'}>
          {p.status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(p)}
            aria-label={`Edit ${p.name}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(p)}
            aria-label={`Delete ${p.name}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Products & Catalog"
        meta={`${pluralize(total, 'product')} total · ${activeCount} active catalog`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            New product
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search SKU, product name, description…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <>
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
                <FilterSelect
                  label="Status"
                  allLabel="All statuses"
                  value={(filters.status as string) ?? ''}
                  onChange={(val) => setFilter('status', val)}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'out_of_stock', label: 'Out of Stock' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                />
              </>
            }
          />
        }
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Total Products</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">{total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Active Catalog</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">{activeCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Low Stock Alerts</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-ink-900'}`}>
              {lowStockCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Total Units in Stock</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {products.reduce((acc, p) => acc + p.stockOnHand, 0).toLocaleString()}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {products.length === 0 ? (
          <EmptyState
            icon={<IconPackage size={32} />}
            title="No products found"
            description="Add products to your catalog to manage SKUs, pricing, costs, and inventory."
            action={<Button variant="primary" onClick={openCreate}>Add product</Button>}
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

      {/* Product Create / Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingProduct ? `Edit ${editingProduct.name}` : 'New Product'}
        description="Configure catalog SKU, category, pricing, and stock replenishment threshold."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="product-form">
              {editingProduct ? 'Save changes' : 'Add product'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU / Barcode" required>
              {({ id }) => (
                <Input
                  id={id}
                  placeholder="e.g. HW-SRV-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Category" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: 'Hardware', label: 'Hardware' },
                    { value: 'Networking', label: 'Networking' },
                    { value: 'Sensors', label: 'Sensors' },
                    { value: 'Software', label: 'Software' },
                    { value: 'Components', label: 'Components' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Product Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="Enterprise Edge Gateway X1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Description">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                placeholder="Technical specifications and notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit Price ($)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Unit Cost ($)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock On Hand" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  value={stockOnHand}
                  onChange={(e) => setStockOnHand(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Reorder Point" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <Field label="Status">
            {({ id }) => (
              <Select
                id={id}
                value={status}
                onChange={(e) => setStatus(e.target.value as Product['status'])}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'out_of_stock', label: 'Out of Stock' },
                  { value: 'archived', label: 'Archived' },
                ]}
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name}?`}
        description="Are you sure you want to remove this product from the catalog? This will affect product lookup across orders and sales."
        confirmLabel="Delete product"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

