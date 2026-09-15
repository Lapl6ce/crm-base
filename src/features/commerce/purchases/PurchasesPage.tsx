import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { IconEdit, IconPlus, IconReceipt, IconTrash } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialPurchases } from '@/data/datasets';
import type { Purchase } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const PO_STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  draft: 'neutral',
  ordered: 'accent',
  received: 'success',
  partially_received: 'warn',
  cancelled: 'danger',
};

const PAYMENT_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  unpaid: 'danger',
  partially_paid: 'warn',
  paid: 'success',
};

export function PurchasesPage() {
  const {
    items: purchases,
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
  } = useLocalCollection<Purchase>({
    collectionKey: 'purchases',
    initialData: initialPurchases,
    defaultSort: { field: 'orderDate', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);

  // Form fields
  const [poNumber, setPoNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [totalAmount, setTotalAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState<Purchase['status']>('ordered');
  const [paymentStatus, setPaymentStatus] = useState<Purchase['paymentStatus']>('unpaid');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [itemsCount, setItemsCount] = useState('1');

  const openCreate = () => {
    setEditingPurchase(null);
    setPoNumber(`PO-2024-${Math.floor(100 + Math.random() * 900)}`);
    setSupplierName('');
    setTotalAmount('35000');
    setCurrency('USD');
    setStatus('ordered');
    setPaymentStatus('unpaid');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    setExpectedDeliveryDate(futureDate.toISOString().split('T')[0]);
    setItemsCount('4');
    setDrawerOpen(true);
  };

  const openEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setPoNumber(p.poNumber);
    setSupplierName(p.supplierName);
    setTotalAmount(String(p.totalAmount));
    setCurrency(p.currency);
    setStatus(p.status);
    setPaymentStatus(p.paymentStatus);
    setExpectedDeliveryDate(p.expectedDeliveryDate ? p.expectedDeliveryDate.split('T')[0] : '');
    setItemsCount(String(p.itemsCount));
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNumber.trim() || !supplierName.trim()) {
      toast.error('PO number and Supplier name are required');
      return;
    }

    const payload = {
      poNumber: poNumber.trim(),
      supplierId: editingPurchase?.supplierId ?? 'supp_gen',
      supplierName: supplierName.trim(),
      orderDate: editingPurchase?.orderDate ?? new Date().toISOString(),
      expectedDeliveryDate: expectedDeliveryDate
        ? new Date(expectedDeliveryDate).toISOString()
        : new Date().toISOString(),
      totalAmount: parseFloat(totalAmount) || 0,
      currency,
      status,
      itemsCount: parseInt(itemsCount, 10) || 1,
      paymentStatus,
    };

    if (editingPurchase) {
      await update(editingPurchase.id, payload);
      toast.success(`PO ${payload.poNumber} updated`);
    } else {
      await create(payload);
      toast.success(`PO ${payload.poNumber} issued`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Purchase Order ${deleteTarget.poNumber} deleted`);
    setDeleteTarget(null);
  };

  const handleMarkReceived = async (p: Purchase) => {
    await update(p.id, { status: 'received' });
    toast.success(`PO ${p.poNumber} marked as received into warehouse`);
  };

  const totalSpend = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const receivedCount = purchases.filter((p) => p.status === 'received').length;
  const pendingOrders = purchases.filter((p) => p.status === 'ordered');
  const unpaidCount = purchases.filter((p) => p.paymentStatus === 'unpaid').length;

  const columns: Column<Purchase>[] = [
    {
      id: 'po',
      header: 'PO #',
      cell: (p) => (
        <span className="font-mono text-xs font-semibold text-accent-700">{p.poNumber}</span>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier / Vendor',
      cell: (p) => (
        <span className="font-medium text-ink-900">{p.supplierName}</span>
      ),
    },
    {
      id: 'orderDate',
      header: 'Ordered Date',
      cell: (p) => <span className="text-xs text-ink-600">{formatDate(p.orderDate)}</span>,
    },
    {
      id: 'expectedDate',
      header: 'Expected Delivery',
      cell: (p) => (
        <span className="text-xs text-ink-600">{formatDate(p.expectedDeliveryDate)}</span>
      ),
    },
    {
      id: 'total',
      header: 'PO Total',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(p.totalAmount, p.currency)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Fulfillment',
      cell: (p) => (
        <Tag tone={PO_STATUS_TONES[p.status] ?? 'neutral'}>
          {p.status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: (p) => (
        <Tag tone={PAYMENT_TONES[p.paymentStatus] ?? 'neutral'}>
          {p.paymentStatus.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          {p.status === 'ordered' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleMarkReceived(p)}
            >
              Receive
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(p)}
            aria-label={`Edit ${p.poNumber}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(p)}
            aria-label={`Delete ${p.poNumber}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Purchase Orders"
        meta={`${pluralize(total, 'order')} · ${formatCurrency(totalSpend, 'USD')} procurement spend`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            Issue PO
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search PO #, supplier name…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <>
                <FilterSelect
                  label="Fulfillment"
                  allLabel="All statuses"
                  value={(filters.status as string) ?? ''}
                  onChange={(val) => setFilter('status', val)}
                  options={[
                    { value: 'ordered', label: 'Ordered (In Transit)' },
                    { value: 'received', label: 'Received' },
                    { value: 'partially_received', label: 'Partially Received' },
                    { value: 'draft', label: 'Draft' },
                  ]}
                />
                <FilterSelect
                  label="Payment"
                  allLabel="All payment states"
                  value={(filters.paymentStatus as string) ?? ''}
                  onChange={(val) => setFilter('paymentStatus', val)}
                  options={[
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'partially_paid', label: 'Partially Paid' },
                    { value: 'paid', label: 'Paid' },
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
            <span className="text-xs font-medium text-ink-500">Total Procurement</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalSpend, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Awaiting Inbound</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">
              {pendingOrders.length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Received POs</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {receivedCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Unpaid Bills</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${unpaidCount > 0 ? 'text-amber-600' : 'text-ink-900'}`}>
              {unpaidCount}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {purchases.length === 0 ? (
          <EmptyState
            icon={<IconReceipt size={32} />}
            title="No purchase orders found"
            description="Manage purchase orders sent to component suppliers and manufacturing vendors."
            action={<Button variant="primary" onClick={openCreate}>Issue PO</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={purchases} keyField="id" />
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
        title={editingPurchase ? `Edit PO ${editingPurchase.poNumber}` : 'Issue Purchase Order'}
        description="Vendor procurement, expected arrival date, and financial terms."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="purchase-form">
              {editingPurchase ? 'Save changes' : 'Issue purchase order'}
            </Button>
          </>
        }
      >
        <form id="purchase-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="PO #" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Status" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Purchase['status'])}
                  options={[
                    { value: 'ordered', label: 'Ordered' },
                    { value: 'received', label: 'Received' },
                    { value: 'partially_received', label: 'Partially Received' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Supplier Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. MicroSilicon Foundry"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
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
            <Field label="Expected Delivery Date" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Payment Status">
              {({ id }) => (
                <Select
                  id={id}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as Purchase['paymentStatus'])}
                  options={[
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'partially_paid', label: 'Partially Paid' },
                    { value: 'paid', label: 'Paid' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Line Items Count">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                value={itemsCount}
                onChange={(e) => setItemsCount(e.target.value)}
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete PO ${deleteTarget?.poNumber}?`}
        description="Are you sure you want to delete this purchase order record?"
        confirmLabel="Delete PO"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

