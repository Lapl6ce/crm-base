import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { IconCheckCircle, IconDollar, IconEdit, IconPlus, IconTrash } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialPayables } from '@/data/datasets';
import type { Payable } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  paid: 'success',
  scheduled: 'accent',
  pending: 'warn',
  overdue: 'danger',
};

export function PayablesPage() {
  const {
    items: payables,
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
  } = useLocalCollection<Payable>({
    collectionKey: 'payables',
    initialData: initialPayables,
    defaultSort: { field: 'dueDate', dir: 'asc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Payable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payable | null>(null);

  // Form fields
  const [billNumber, setBillNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<Payable['status']>('pending');
  const [paymentMethod, setPaymentMethod] = useState('Wire Transfer');

  const openCreate = () => {
    setEditingBill(null);
    setBillNumber(`BILL-2024-${Math.floor(100 + Math.random() * 900)}`);
    setSupplierName('');
    setAmount('25000');
    setCurrency('USD');
    const future = new Date();
    future.setDate(future.getDate() + 14);
    setDueDate(future.toISOString().split('T')[0]);
    setStatus('pending');
    setPaymentMethod('Wire Transfer');
    setDrawerOpen(true);
  };

  const openEdit = (p: Payable) => {
    setEditingBill(p);
    setBillNumber(p.billNumber);
    setSupplierName(p.supplierName || '');
    setAmount(String(p.amount));
    setCurrency(p.currency);
    setDueDate(p.dueDate ? p.dueDate.split('T')[0] : '');
    setStatus(p.status);
    setPaymentMethod(p.paymentMethod || 'Wire Transfer');
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber.trim() || !supplierName.trim()) {
      toast.error('Bill # and Supplier name are required');
      return;
    }

    const payload = {
      billNumber: billNumber.trim(),
      supplierName: supplierName.trim(),
      amount: parseFloat(amount) || 0,
      currency,
      dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
      status,
      paymentMethod,
    };

    if (editingBill) {
      await update(editingBill.id, payload);
      toast.success(`Bill ${payload.billNumber} updated`);
    } else {
      await create(payload);
      toast.success(`Bill ${payload.billNumber} added to AP ledger`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Bill ${deleteTarget.billNumber} deleted`);
    setDeleteTarget(null);
  };

  const handleMarkPaid = async (p: Payable) => {
    await update(p.id, { status: 'paid' });
    toast.success(`Bill ${p.billNumber} marked as settled / paid`);
  };

  const totalOutstanding = payables
    .filter((p) => p.status !== 'paid')
    .reduce((acc, p) => acc + p.amount, 0);

  const overdueBills = payables.filter((p) => p.status === 'overdue');
  const scheduledBills = payables.filter((p) => p.status === 'scheduled');
  const scheduledTotal = scheduledBills.reduce((acc, p) => acc + p.amount, 0);

  const columns: Column<Payable>[] = [
    {
      id: 'bill',
      header: 'Bill #',
      cell: (p) => (
        <span className="font-mono text-xs font-semibold text-accent-700">{p.billNumber}</span>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier / Vendor',
      cell: (p) => <span className="font-medium text-ink-900">{p.supplierName}</span>,
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      cell: (p) => <span className="text-xs text-ink-600">{formatDate(p.dueDate)}</span>,
    },
    {
      id: 'method',
      header: 'Disbursement Method',
      cell: (p) => <span className="text-xs text-ink-600">{p.paymentMethod ?? 'Wire Transfer'}</span>,
    },
    {
      id: 'amount',
      header: 'Bill Amount',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(p.amount, p.currency)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (p) => (
        <Tag tone={STATUS_TONES[p.status] ?? 'neutral'}>
          {p.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          {p.status !== 'paid' && (
            <Button
              size="sm"
              variant="secondary"
              icon={<IconCheckCircle size={14} />}
              onClick={() => handleMarkPaid(p)}
            >
              Pay
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(p)}
            aria-label={`Edit ${p.billNumber}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(p)}
            aria-label={`Delete ${p.billNumber}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Accounts Payable (AP)"
        meta={`${pluralize(total, 'bill')} registered · ${formatCurrency(totalOutstanding, 'USD')} unpaid vendor liabilities`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            Record bill
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search bill #, supplier name…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <FilterSelect
                label="Status"
                allLabel="All statuses"
                value={(filters.status as string) ?? ''}
                onChange={(val) => setFilter('status', val)}
                options={[
                  { value: 'pending', label: 'Pending Payment' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'paid', label: 'Paid / Settled' },
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
            <span className="text-xs font-medium text-ink-500">Unpaid Payables</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalOutstanding, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Scheduled Outflows</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">
              {formatCurrency(scheduledTotal, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Past Due Vendor Bills</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${overdueBills.length > 0 ? 'text-danger-600' : 'text-ink-900'}`}>
              {overdueBills.length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Settled Bills</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {payables.filter((p) => p.status === 'paid').length}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {payables.length === 0 ? (
          <EmptyState
            icon={<IconDollar size={32} />}
            title="No payable bills found"
            description="Manage vendor invoices, scheduled cash disbursements, and payment due dates."
            action={<Button variant="primary" onClick={openCreate}>Record bill</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={payables} keyField="id" />
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
        title={editingBill ? `Edit ${editingBill.billNumber}` : 'Record Vendor Bill'}
        description="Schedule vendor payment disbursement and record invoice details."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="ap-form">
              {editingBill ? 'Save changes' : 'Add bill'}
            </Button>
          </>
        }
      >
        <form id="ap-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bill #" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Disbursement Method" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  options={[
                    { value: 'Wire Transfer', label: 'Wire Transfer' },
                    { value: 'ACH Corporate', label: 'ACH Corporate' },
                    { value: 'Check', label: 'Paper Check' },
                    { value: 'Corporate Card', label: 'Corporate Card' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Vendor / Supplier Name" required>
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
            <Field label="Amount ($)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Due Date" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <Field label="Status" required>
            {({ id }) => (
              <Select
                id={id}
                value={status}
                onChange={(e) => setStatus(e.target.value as Payable['status'])}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'paid', label: 'Paid' },
                ]}
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Bill ${deleteTarget?.billNumber}?`}
        description="Are you sure you want to delete this payable record?"
        confirmLabel="Delete bill"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
