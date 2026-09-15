import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { IconDollar, IconEdit, IconPlus, IconTrash } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialPayments } from '@/data/datasets';
import type { Payment } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  completed: 'success',
  pending: 'warn',
  failed: 'danger',
};

export function PaymentsPage() {
  const {
    items: payments,
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
  } = useLocalCollection<Payment>({
    collectionKey: 'payments',
    initialData: initialPayments,
    defaultSort: { field: 'date', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  // Form fields
  const [referenceNumber, setReferenceNumber] = useState('');
  const [type, setType] = useState<Payment['type']>('inbound');
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState<Payment['paymentMethod']>('wire');
  const [status, setStatus] = useState<Payment['status']>('completed');

  const openCreate = () => {
    setEditingPayment(null);
    setReferenceNumber(`PAY-${Math.floor(100000 + Math.random() * 900000)}`);
    setType('inbound');
    setPartyName('');
    setAmount('15000');
    setCurrency('USD');
    setPaymentMethod('wire');
    setStatus('completed');
    setDrawerOpen(true);
  };

  const openEdit = (p: Payment) => {
    setEditingPayment(p);
    setReferenceNumber(p.referenceNumber || '');
    setType(p.type);
    setPartyName(p.partyName);
    setAmount(String(p.amount));
    setCurrency(p.currency);
    setPaymentMethod((p.paymentMethod as Payment['paymentMethod']) || 'wire');
    setStatus(p.status);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim() || !partyName.trim()) {
      toast.error('Reference # and Counterparty are required');
      return;
    }

    const payload = {
      referenceNumber: referenceNumber.trim(),
      type,
      partyName: partyName.trim(),
      amount: parseFloat(amount) || 0,
      currency,
      paymentMethod,
      status,
      date: editingPayment?.date ?? new Date().toISOString(),
    };

    if (editingPayment) {
      await update(editingPayment.id, payload);
      toast.success(`Payment ${payload.referenceNumber} updated`);
    } else {
      await create(payload);
      toast.success(`Payment ${payload.referenceNumber} recorded`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Payment ${deleteTarget.referenceNumber} deleted`);
    setDeleteTarget(null);
  };

  const inboundTotal = payments
    .filter((p) => p.type === 'inbound' && p.status === 'completed')
    .reduce((acc, p) => acc + p.amount, 0);

  const outboundTotal = payments
    .filter((p) => p.type === 'outbound' && p.status === 'completed')
    .reduce((acc, p) => acc + p.amount, 0);

  const netCash = inboundTotal - outboundTotal;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  const columns: Column<Payment>[] = [
    {
      id: 'ref',
      header: 'Reference #',
      cell: (p) => (
        <span className="font-mono text-xs font-semibold text-ink-700">{p.referenceNumber}</span>
      ),
    },
    {
      id: 'type',
      header: 'Direction',
      cell: (p) => (
        <Tag tone={p.type === 'inbound' ? 'success' : 'warn'}>
          {p.type === 'inbound' ? 'INBOUND' : 'OUTBOUND'}
        </Tag>
      ),
    },
    {
      id: 'party',
      header: 'Counterparty',
      cell: (p) => <span className="font-medium text-ink-900">{p.partyName}</span>,
    },
    {
      id: 'method',
      header: 'Method',
      cell: (p) => (
        <span className="font-mono text-xs uppercase text-ink-600">{p.paymentMethod}</span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (p) => (
        <span
          className={`font-mono text-xs font-semibold ${
            p.type === 'inbound' ? 'text-emerald-600' : 'text-ink-900'
          }`}
        >
          {p.type === 'inbound' ? '+' : '-'}
          {formatCurrency(p.amount, p.currency)}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      cell: (p) => <span className="text-xs text-ink-600">{formatDate(p.date)}</span>,
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
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(p)}
            aria-label={`Edit ${p.referenceNumber}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(p)}
            aria-label={`Delete ${p.referenceNumber}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Payments & Cash Transactions"
        meta={`${pluralize(total, 'transaction')} recorded · Cash & banking transactions`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            Record payment
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search reference #, counterparty…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <>
                <FilterSelect
                  label="Direction"
                  allLabel="All directions"
                  value={(filters.type as string) ?? ''}
                  onChange={(val) => setFilter('type', val)}
                  options={[
                    { value: 'inbound', label: 'Inbound (Receivable collections)' },
                    { value: 'outbound', label: 'Outbound (Vendor bills & expenses)' },
                  ]}
                />
                <FilterSelect
                  label="Status"
                  allLabel="All statuses"
                  value={(filters.status as string) ?? ''}
                  onChange={(val) => setFilter('status', val)}
                  options={[
                    { value: 'completed', label: 'Completed' },
                    { value: 'pending', label: 'Pending Settlement' },
                    { value: 'failed', label: 'Failed' },
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
            <span className="text-xs font-medium text-ink-500">Net Settled Cash Flow</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${netCash >= 0 ? 'text-emerald-600' : 'text-danger-600'}`}>
              {formatCurrency(netCash, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Total Inbound</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(inboundTotal, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Total Outbound</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(outboundTotal, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Pending Settlements</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-ink-900'}`}>
              {pendingCount}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {payments.length === 0 ? (
          <EmptyState
            icon={<IconDollar size={32} />}
            title="No payment records found"
            description="Record payments received from customers or disbursements sent to vendors."
            action={<Button variant="primary" onClick={openCreate}>Record payment</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={payments} keyField="id" />
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
        title={editingPayment ? `Edit Payment ${editingPayment.referenceNumber}` : 'Record Payment'}
        description="Log bank wire, ACH transfer, or check transaction."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="pay-form">
              {editingPayment ? 'Save changes' : 'Record payment'}
            </Button>
          </>
        }
      >
        <form id="pay-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference #" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Direction" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={type}
                  onChange={(e) => setType(e.target.value as Payment['type'])}
                  options={[
                    { value: 'inbound', label: 'Inbound (Customer Payment)' },
                    { value: 'outbound', label: 'Outbound (Vendor / Expense)' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Counterparty Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Vertex Global Systems"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
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

            <Field label="Payment Method" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as Payment['paymentMethod'])}
                  options={[
                    { value: 'wire', label: 'Wire Transfer' },
                    { value: 'ach', label: 'ACH / Direct Debit' },
                    { value: 'credit_card', label: 'Credit Card' },
                    { value: 'check', label: 'Paper Check' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Status" required>
            {({ id }) => (
              <Select
                id={id}
                value={status}
                onChange={(e) => setStatus(e.target.value as Payment['status'])}
                options={[
                  { value: 'completed', label: 'Completed' },
                  { value: 'pending', label: 'Pending Settlement' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Payment ${deleteTarget?.referenceNumber}?`}
        description="Are you sure you want to delete this payment transaction record?"
        confirmLabel="Delete payment"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
