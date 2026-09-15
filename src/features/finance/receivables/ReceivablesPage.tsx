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
import { initialReceivables } from '@/data/datasets';
import type { Receivable } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const BUCKET_LABELS: Record<string, string> = {
  current: 'Current (Not Due)',
  '1_30': '1–30 Days Overdue',
  '31_60': '31–60 Days Overdue',
  '61_90': '61–90 Days Overdue',
  '90_plus': '90+ Days (Severe)',
};

const BUCKET_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  current: 'success',
  '1_30': 'accent',
  '31_60': 'warn',
  '61_90': 'danger',
  '90_plus': 'danger',
};

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  collected: 'success',
  pending: 'accent',
  overdue: 'danger',
  disputed: 'warn',
};

export function ReceivablesPage() {
  const {
    items: receivables,
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
  } = useLocalCollection<Receivable>({
    collectionKey: 'receivables',
    initialData: initialReceivables,
    defaultSort: { field: 'dueDate', dir: 'asc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Receivable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Receivable | null>(null);

  // Form fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState('');
  const [agingBucket, setAgingBucket] = useState<Receivable['agingBucket']>('current');
  const [status, setStatus] = useState<Receivable['status']>('pending');

  const openCreate = () => {
    setEditingItem(null);
    setInvoiceNumber(`INV-2024-${Math.floor(100 + Math.random() * 900)}`);
    setCustomerName('');
    setAmount('15000');
    setCurrency('USD');
    const future = new Date();
    future.setDate(future.getDate() + 30);
    setDueDate(future.toISOString().split('T')[0]);
    setAgingBucket('current');
    setStatus('pending');
    setDrawerOpen(true);
  };

  const openEdit = (rec: Receivable) => {
    setEditingItem(rec);
    setInvoiceNumber(rec.invoiceNumber);
    setCustomerName(rec.customerName || '');
    setAmount(String(rec.amount));
    setCurrency(rec.currency);
    setDueDate(rec.dueDate ? rec.dueDate.split('T')[0] : '');
    setAgingBucket(rec.agingBucket);
    setStatus(rec.status);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !customerName.trim()) {
      toast.error('Invoice # and Customer name are required');
      return;
    }

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      customerName: customerName.trim(),
      amount: parseFloat(amount) || 0,
      currency,
      dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
      agingBucket,
      status,
    };

    if (editingItem) {
      await update(editingItem.id, payload);
      toast.success(`Receivable ${payload.invoiceNumber} updated`);
    } else {
      await create(payload);
      toast.success(`Receivable ${payload.invoiceNumber} logged`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Receivable ${deleteTarget.invoiceNumber} deleted`);
    setDeleteTarget(null);
  };

  const handleMarkCollected = async (rec: Receivable) => {
    await update(rec.id, { status: 'collected' });
    toast.success(`Invoice ${rec.invoiceNumber} marked as collected!`);
  };

  const totalOutstanding = receivables
    .filter((r) => r.status !== 'collected')
    .reduce((acc, r) => acc + r.amount, 0);

  const currentAmt = receivables
    .filter((r) => r.agingBucket === 'current' && r.status !== 'collected')
    .reduce((acc, r) => acc + r.amount, 0);

  const overdue30 = receivables
    .filter((r) => (r.agingBucket === '1_30' || r.agingBucket === '31_60') && r.status !== 'collected')
    .reduce((acc, r) => acc + r.amount, 0);

  const severeOverdue = receivables
    .filter((r) => (r.agingBucket === '61_90' || r.agingBucket === '90_plus') && r.status !== 'collected')
    .reduce((acc, r) => acc + r.amount, 0);

  const columns: Column<Receivable>[] = [
    {
      id: 'invoice',
      header: 'Invoice #',
      cell: (r) => (
        <span className="font-mono text-xs font-semibold text-accent-700">{r.invoiceNumber}</span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer Account',
      cell: (r) => <span className="font-medium text-ink-900">{r.customerName}</span>,
    },
    {
      id: 'amount',
      header: 'Outstanding Balance',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(r.amount, r.currency)}
        </span>
      ),
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      cell: (r) => <span className="text-xs text-ink-600">{formatDate(r.dueDate)}</span>,
    },
    {
      id: 'aging',
      header: 'Aging Schedule',
      cell: (r) => (
        <Tag tone={BUCKET_TONES[r.agingBucket] ?? 'neutral'}>
          {BUCKET_LABELS[r.agingBucket] ?? r.agingBucket}
        </Tag>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => (
        <Tag tone={STATUS_TONES[r.status] ?? 'neutral'}>
          {r.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status !== 'collected' && (
            <Button
              size="sm"
              variant="secondary"
              icon={<IconCheckCircle size={14} />}
              onClick={() => handleMarkCollected(r)}
            >
              Collect
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(r)}
            aria-label={`Edit ${r.invoiceNumber}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(r)}
            aria-label={`Delete ${r.invoiceNumber}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Accounts Receivable (AR)"
        meta={`${pluralize(total, 'invoice')} in aging · ${formatCurrency(totalOutstanding, 'USD')} total outstanding`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            Add receivable
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search invoice #, customer name…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <>
                <FilterSelect
                  label="Aging Schedule"
                  allLabel="All aging buckets"
                  value={(filters.agingBucket as string) ?? ''}
                  onChange={(val) => setFilter('agingBucket', val)}
                  options={[
                    { value: 'current', label: 'Current (Not due yet)' },
                    { value: '1_30', label: '1–30 Days Overdue' },
                    { value: '31_60', label: '31–60 Days Overdue' },
                    { value: '61_90', label: '61–90 Days Overdue' },
                    { value: '90_plus', label: '90+ Days' },
                  ]}
                />
                <FilterSelect
                  label="Status"
                  allLabel="All statuses"
                  value={(filters.status as string) ?? ''}
                  onChange={(val) => setFilter('status', val)}
                  options={[
                    { value: 'pending', label: 'Pending Payment' },
                    { value: 'overdue', label: 'Overdue' },
                    { value: 'collected', label: 'Collected' },
                    { value: 'disputed', label: 'In Dispute' },
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
            <span className="text-xs font-medium text-ink-500">Total Outstanding AR</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalOutstanding, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Current (Within Terms)</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {formatCurrency(currentAmt, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">1–60 Days Overdue</span>
            <p className="mt-1 font-mono text-2xl font-bold text-amber-600">
              {formatCurrency(overdue30, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">60+ Days Severe Risk</span>
            <p className="mt-1 font-mono text-2xl font-bold text-danger-600">
              {formatCurrency(severeOverdue, 'USD')}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {receivables.length === 0 ? (
          <EmptyState
            icon={<IconDollar size={32} />}
            title="No receivables in ledger"
            description="Track customer credit terms, aging cohorts, and outstanding invoices."
            action={<Button variant="primary" onClick={openCreate}>Add receivable</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={receivables} keyField="id" />
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
        title={editingItem ? `Edit ${editingItem.invoiceNumber}` : 'Record Receivable'}
        description="Add invoice to customer AR aging tracking schedule."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="rec-form">
              {editingItem ? 'Save changes' : 'Add receivable'}
            </Button>
          </>
        }
      >
        <form id="rec-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice #" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Aging Category" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={agingBucket}
                  onChange={(e) => setAgingBucket(e.target.value as Receivable['agingBucket'])}
                  options={[
                    { value: 'current', label: 'Current' },
                    { value: '1_30', label: '1–30 Days' },
                    { value: '31_60', label: '31–60 Days' },
                    { value: '61_90', label: '61–90 Days' },
                    { value: '90_plus', label: '90+ Days' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Customer Account" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Borealis Genomics"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
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
                onChange={(e) => setStatus(e.target.value as Receivable['status'])}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'collected', label: 'Collected' },
                  { value: 'disputed', label: 'Disputed' },
                ]}
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Receivable ${deleteTarget?.invoiceNumber}?`}
        description="Are you sure you want to remove this receivable entry?"
        confirmLabel="Delete receivable"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
