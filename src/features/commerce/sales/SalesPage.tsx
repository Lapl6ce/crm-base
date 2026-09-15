import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { IconCart, IconEdit, IconPlus, IconTrash } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialSales } from '@/data/datasets';
import type { Sale } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  draft: 'neutral',
  issued: 'accent',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'neutral',
};

export function SalesPage() {
  const {
    items: sales,
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
  } = useLocalCollection<Sale>({
    collectionKey: 'sales',
    initialData: initialSales,
    defaultSort: { field: 'date', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);

  // Form fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [totalAmount, setTotalAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState<Sale['status']>('issued');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [itemsCount, setItemsCount] = useState('1');
  const [notes, setNotes] = useState('');

  const openCreate = () => {
    setEditingSale(null);
    setInvoiceNumber(`INV-2024-${Math.floor(100 + Math.random() * 900)}`);
    setCustomerName('');
    setTotalAmount('12500');
    setCurrency('USD');
    setStatus('issued');
    setPaymentTerms('Net 30');
    setItemsCount('3');
    setNotes('');
    setDrawerOpen(true);
  };

  const openEdit = (sale: Sale) => {
    setEditingSale(sale);
    setInvoiceNumber(sale.invoiceNumber);
    setCustomerName(sale.customerName);
    setTotalAmount(String(sale.totalAmount));
    setCurrency(sale.currency);
    setStatus(sale.status);
    setPaymentTerms(sale.paymentTerms || 'Net 30');
    setItemsCount(String(sale.itemsCount));
    setNotes(sale.notes || '');
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !customerName.trim()) {
      toast.error('Invoice number and Customer name are required');
      return;
    }

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      customerId: editingSale?.customerId ?? 'cust_gen',
      customerName: customerName.trim(),
      date: editingSale?.date ?? new Date().toISOString(),
      totalAmount: parseFloat(totalAmount) || 0,
      currency,
      status,
      paymentTerms,
      itemsCount: parseInt(itemsCount, 10) || 1,
      notes: notes.trim() || undefined,
    };

    if (editingSale) {
      await update(editingSale.id, payload);
      toast.success(`Invoice ${payload.invoiceNumber} updated`);
    } else {
      await create(payload);
      toast.success(`Invoice ${payload.invoiceNumber} created`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Invoice ${deleteTarget.invoiceNumber} deleted`);
    setDeleteTarget(null);
  };

  const totalInvoiced = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const paidSales = sales.filter((s) => s.status === 'paid');
  const paidTotal = paidSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const overdueCount = sales.filter((s) => s.status === 'overdue').length;

  const columns: Column<Sale>[] = [
    {
      id: 'invoice',
      header: 'Invoice #',
      cell: (s) => (
        <span className="font-mono text-xs font-semibold text-accent-700">{s.invoiceNumber}</span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: (s) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink-900">{s.customerName}</span>
          <span className="text-xs text-ink-400">{s.paymentTerms}</span>
        </div>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      cell: (s) => <span className="text-xs text-ink-600">{formatDate(s.date)}</span>,
    },
    {
      id: 'items',
      header: 'Items',
      align: 'right',
      cell: (s) => <span className="font-mono text-xs text-ink-600">{s.itemsCount}</span>,
    },
    {
      id: 'total',
      header: 'Amount',
      align: 'right',
      cell: (s) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(s.totalAmount, s.currency)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (s) => (
        <Tag tone={STATUS_TONES[s.status] ?? 'neutral'}>
          {s.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(s)}
            aria-label={`Edit ${s.invoiceNumber}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(s)}
            aria-label={`Delete ${s.invoiceNumber}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sales Invoices"
        meta={`${pluralize(total, 'invoice')} · ${formatCurrency(totalInvoiced, 'USD')} total volume`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            Create invoice
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search invoice #, customer name, notes…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <FilterSelect
                label="Status"
                allLabel="All statuses"
                value={(filters.status as string) ?? ''}
                onChange={(val) => setFilter('status', val)}
                options={[
                  { value: 'paid', label: 'Paid' },
                  { value: 'issued', label: 'Issued (Open)' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'cancelled', label: 'Cancelled' },
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
            <span className="text-xs font-medium text-ink-500">Total Billed</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalInvoiced, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Collected Revenue</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {formatCurrency(paidTotal, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Overdue Invoices</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${overdueCount > 0 ? 'text-danger-600' : 'text-ink-900'}`}>
              {overdueCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Collection Rate</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {totalInvoiced > 0 ? `${((paidTotal / totalInvoiced) * 100).toFixed(0)}%` : '0%'}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {sales.length === 0 ? (
          <EmptyState
            icon={<IconCart size={32} />}
            title="No sales invoices found"
            description="Create sales transactions and generate customer invoices."
            action={<Button variant="primary" onClick={openCreate}>Create invoice</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={sales} keyField="id" />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Invoice Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingSale ? `Edit Invoice ${editingSale.invoiceNumber}` : 'New Sales Invoice'}
        description="Specify customer billing details, payment terms, and invoice value."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="sale-form">
              {editingSale ? 'Save changes' : 'Create invoice'}
            </Button>
          </>
        }
      >
        <form id="sale-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            <Field label="Status" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Sale['status'])}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'issued', label: 'Issued' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'overdue', label: 'Overdue' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Customer Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Vertex Global Systems"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
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
            <Field label="Payment Terms">
              {({ id }) => (
                <Select
                  id={id}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  options={[
                    { value: 'Due on Receipt', label: 'Due on Receipt' },
                    { value: 'Net 15', label: 'Net 15' },
                    { value: 'Net 30', label: 'Net 30' },
                    { value: 'Net 60', label: 'Net 60' },
                  ]}
                />
              )}
            </Field>

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
          </div>

          <Field label="Notes / Memo">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                placeholder="Additional invoice notes, purchase order references..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Invoice ${deleteTarget?.invoiceNumber}?`}
        description="Are you sure you want to permanently delete this invoice record?"
        confirmLabel="Delete invoice"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
