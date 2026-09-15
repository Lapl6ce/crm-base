import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { IconCart, IconEdit, IconPlus, IconTrash } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialOrders } from '@/data/datasets';
import type { Order } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const FULFILLMENT_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  pending: 'warn',
  processing: 'accent',
  shipped: 'accent',
  delivered: 'success',
  cancelled: 'danger',
};

const NEXT_STATUS: Record<Order['fulfillmentStatus'], Order['fulfillmentStatus'] | null> = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
  delivered: null,
  cancelled: null,
};

export function OrdersPage() {
  const {
    items: orders,
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
  } = useLocalCollection<Order>({
    collectionKey: 'orders',
    initialData: initialOrders,
    defaultSort: { field: 'orderDate', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  // Form fields
  const [orderNumber, setOrderNumber] = useState('');
  const [type, setType] = useState<Order['type']>('sales');
  const [partyName, setPartyName] = useState('');
  const [totalAmount, setTotalAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [fulfillmentStatus, setFulfillmentStatus] = useState<Order['fulfillmentStatus']>('processing');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [itemsCount, setItemsCount] = useState('1');

  const openCreate = () => {
    setEditingOrder(null);
    setOrderNumber(`ORD-2024-${Math.floor(1000 + Math.random() * 9000)}`);
    setType('sales');
    setPartyName('');
    setTotalAmount('15000');
    setCurrency('USD');
    setFulfillmentStatus('processing');
    setTrackingNumber(`TRK-${Math.floor(100000 + Math.random() * 900000)}`);
    setItemsCount('3');
    setDrawerOpen(true);
  };

  const openEdit = (ord: Order) => {
    setEditingOrder(ord);
    setOrderNumber(ord.orderNumber);
    setType(ord.type);
    setPartyName(ord.partyName);
    setTotalAmount(String(ord.totalAmount));
    setCurrency(ord.currency);
    setFulfillmentStatus(ord.fulfillmentStatus);
    setTrackingNumber(ord.trackingNumber || '');
    setItemsCount(String(ord.itemsCount));
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !partyName.trim()) {
      toast.error('Order number and Party name are required');
      return;
    }

    const payload = {
      orderNumber: orderNumber.trim(),
      type,
      partyName: partyName.trim(),
      orderDate: editingOrder?.orderDate ?? new Date().toISOString(),
      fulfillmentStatus,
      totalAmount: parseFloat(totalAmount) || 0,
      currency,
      trackingNumber: trackingNumber.trim() || undefined,
      itemsCount: parseInt(itemsCount, 10) || 1,
    };

    if (editingOrder) {
      await update(editingOrder.id, payload);
      toast.success(`Order ${payload.orderNumber} updated`);
    } else {
      await create(payload);
      toast.success(`Order ${payload.orderNumber} created`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Order ${deleteTarget.orderNumber} deleted`);
    setDeleteTarget(null);
  };

  const handleAdvanceStatus = async (ord: Order) => {
    const next = NEXT_STATUS[ord.fulfillmentStatus];
    if (!next) return;
    await update(ord.id, { fulfillmentStatus: next });
    toast.success(`Order ${ord.orderNumber} status updated to ${next.toUpperCase()}`);
  };

  const pendingCount = orders.filter((o) => o.fulfillmentStatus === 'pending').length;
  const processingCount = orders.filter((o) => o.fulfillmentStatus === 'processing').length;
  const shippedCount = orders.filter((o) => o.fulfillmentStatus === 'shipped').length;
  const totalVolume = orders.reduce((acc, o) => acc + o.totalAmount, 0);

  const columns: Column<Order>[] = [
    {
      id: 'order',
      header: 'Order #',
      cell: (o) => (
        <span className="font-mono text-xs font-semibold text-accent-700">{o.orderNumber}</span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (o) => (
        <Tag tone={o.type === 'sales' ? 'accent' : 'warn'}>
          {o.type === 'sales' ? 'Sales Order' : 'PO / Supply'}
        </Tag>
      ),
    },
    {
      id: 'party',
      header: 'Counterparty',
      cell: (o) => <span className="font-medium text-ink-900">{o.partyName}</span>,
    },
    {
      id: 'date',
      header: 'Order Date',
      cell: (o) => <span className="text-xs text-ink-600">{formatDate(o.orderDate)}</span>,
    },
    {
      id: 'amount',
      header: 'Total Value',
      align: 'right',
      cell: (o) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(o.totalAmount, o.currency)}
        </span>
      ),
    },
    {
      id: 'tracking',
      header: 'Tracking #',
      cell: (o) => (
        <span className="font-mono text-xs text-ink-500">
          {o.trackingNumber ?? '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Fulfillment',
      cell: (o) => (
        <Tag tone={FULFILLMENT_TONES[o.fulfillmentStatus] ?? 'neutral'}>
          {o.fulfillmentStatus.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (o) => {
        const next = NEXT_STATUS[o.fulfillmentStatus];
        return (
          <div className="flex items-center justify-end gap-1">
            {next && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAdvanceStatus(o)}
              >
                Mark {next}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              icon={<IconEdit size={14} />}
              onClick={() => openEdit(o)}
              aria-label={`Edit ${o.orderNumber}`}
            />
            <Button
              size="sm"
              variant="ghost"
              icon={<IconTrash size={14} />}
              onClick={() => setDeleteTarget(o)}
              aria-label={`Delete ${o.orderNumber}`}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Orders & Fulfillment"
        meta={`${pluralize(total, 'order')} · ${formatCurrency(totalVolume, 'USD')} active throughput`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            New order
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search order #, customer, tracking #…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <>
                <FilterSelect
                  label="Type"
                  allLabel="All order types"
                  value={(filters.type as string) ?? ''}
                  onChange={(val) => setFilter('type', val)}
                  options={[
                    { value: 'sales', label: 'Sales Orders' },
                    { value: 'purchase', label: 'Purchase Orders' },
                  ]}
                />
                <FilterSelect
                  label="Fulfillment"
                  allLabel="All stages"
                  value={(filters.fulfillmentStatus as string) ?? ''}
                  onChange={(val) => setFilter('fulfillmentStatus', val)}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'cancelled', label: 'Cancelled' },
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
            <span className="text-xs font-medium text-ink-500">Total Throughput</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalVolume, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">In Preparation</span>
            <p className="mt-1 font-mono text-2xl font-bold text-amber-600">
              {pendingCount + processingCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">In Transit</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">{shippedCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Delivered</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {orders.filter((o) => o.fulfillmentStatus === 'delivered').length}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {orders.length === 0 ? (
          <EmptyState
            icon={<IconCart size={32} />}
            title="No orders found"
            description="Track unified order fulfillment across sales distribution and inventory procurement."
            action={<Button variant="primary" onClick={openCreate}>New order</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={orders} keyField="id" />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingOrder ? `Edit Order ${editingOrder.orderNumber}` : 'Create Unified Order'}
        description="Configure order party, order type, tracking details, and fulfillment state."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="order-form">
              {editingOrder ? 'Save changes' : 'Create order'}
            </Button>
          </>
        }
      >
        <form id="order-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order #" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Order Type" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={type}
                  onChange={(e) => setType(e.target.value as Order['type'])}
                  options={[
                    { value: 'sales', label: 'Sales Order (Outbound)' },
                    { value: 'purchase', label: 'Purchase Order (Inbound)' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Counterparty Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Vertex Global or MicroSilicon"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                required
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Amount ($)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Currency">
              {({ id }) => (
                <Input
                  id={id}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fulfillment Status" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={fulfillmentStatus}
                  onChange={(e) =>
                    setFulfillmentStatus(e.target.value as Order['fulfillmentStatus'])
                  }
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              )}
            </Field>

            <Field label="Line Items">
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  value={itemsCount}
                  onChange={(e) => setItemsCount(e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Tracking Number">
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. TRK-982144"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Order ${deleteTarget?.orderNumber}?`}
        description="Are you sure you want to delete this order record?"
        confirmLabel="Delete order"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

