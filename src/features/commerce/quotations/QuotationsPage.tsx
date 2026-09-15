import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { IconEdit, IconFileText, IconPlus, IconTrash } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialQuotations } from '@/data/datasets';
import type { Quotation } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  draft: 'neutral',
  sent: 'accent',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warn',
};

export function QuotationsPage() {
  const {
    items: quotations,
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
  } = useLocalCollection<Quotation>({
    collectionKey: 'quotations',
    initialData: initialQuotations,
    defaultSort: { field: 'createdAt', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);

  // Form fields
  const [quoteNumber, setQuoteNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [totalAmount, setTotalAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState<Quotation['status']>('sent');
  const [validUntil, setValidUntil] = useState('');
  const [itemsCount, setItemsCount] = useState('1');
  const [notes, setNotes] = useState('');

  const openCreate = () => {
    setEditingQuote(null);
    setQuoteNumber(`QUO-2024-${Math.floor(100 + Math.random() * 900)}`);
    setCustomerName('');
    setTotalAmount('18500');
    setCurrency('USD');
    setStatus('sent');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setValidUntil(futureDate.toISOString().split('T')[0]);
    setItemsCount('2');
    setNotes('');
    setDrawerOpen(true);
  };

  const openEdit = (quote: Quotation) => {
    setEditingQuote(quote);
    setQuoteNumber(quote.quoteNumber);
    setCustomerName(quote.customerName);
    setTotalAmount(String(quote.totalAmount));
    setCurrency(quote.currency);
    setStatus(quote.status);
    setValidUntil(quote.validUntil ? quote.validUntil.split('T')[0] : '');
    setItemsCount(String(quote.itemsCount));
    setNotes(quote.notes || '');
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteNumber.trim() || !customerName.trim()) {
      toast.error('Quote number and Customer name are required');
      return;
    }

    const payload = {
      quoteNumber: quoteNumber.trim(),
      customerId: editingQuote?.customerId ?? 'cust_gen',
      customerName: customerName.trim(),
      totalAmount: parseFloat(totalAmount) || 0,
      currency,
      status,
      validUntil: validUntil ? new Date(validUntil).toISOString() : new Date().toISOString(),
      itemsCount: parseInt(itemsCount, 10) || 1,
      notes: notes.trim() || undefined,
    };

    if (editingQuote) {
      await update(editingQuote.id, payload);
      toast.success(`Quote ${payload.quoteNumber} updated`);
    } else {
      await create(payload);
      toast.success(`Quote ${payload.quoteNumber} created`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Quote ${deleteTarget.quoteNumber} deleted`);
    setDeleteTarget(null);
  };

  const handleMarkAccepted = async (quote: Quotation) => {
    await update(quote.id, { status: 'accepted' });
    toast.success(`Quote ${quote.quoteNumber} accepted!`);
  };

  const totalQuoted = quotations.reduce((acc, q) => acc + q.totalAmount, 0);
  const acceptedQuotes = quotations.filter((q) => q.status === 'accepted');
  const acceptedTotal = acceptedQuotes.reduce((acc, q) => acc + q.totalAmount, 0);
  const pendingCount = quotations.filter((q) => q.status === 'sent').length;

  const columns: Column<Quotation>[] = [
    {
      id: 'quote',
      header: 'Quote #',
      cell: (q) => (
        <span className="font-mono text-xs font-semibold text-accent-700">{q.quoteNumber}</span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer / Prospect',
      cell: (q) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink-900">{q.customerName}</span>
          {q.notes && <span className="line-clamp-1 text-xs text-ink-400">{q.notes}</span>}
        </div>
      ),
    },
    {
      id: 'valid',
      header: 'Valid Until',
      cell: (q) => <span className="text-xs text-ink-600">{formatDate(q.validUntil)}</span>,
    },
    {
      id: 'items',
      header: 'Items',
      align: 'right',
      cell: (q) => <span className="font-mono text-xs text-ink-600">{q.itemsCount}</span>,
    },
    {
      id: 'total',
      header: 'Quote Value',
      align: 'right',
      cell: (q) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(q.totalAmount, q.currency)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (q) => (
        <Tag tone={STATUS_TONES[q.status] ?? 'neutral'}>
          {q.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (q) => (
        <div className="flex items-center justify-end gap-1">
          {q.status === 'sent' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleMarkAccepted(q)}
            >
              Accept
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(q)}
            aria-label={`Edit ${q.quoteNumber}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(q)}
            aria-label={`Delete ${q.quoteNumber}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Quotations & Proposals"
        meta={`${pluralize(total, 'quotation')} · ${formatCurrency(totalQuoted, 'USD')} total value`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            Create quote
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search quote #, customer, memo…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <FilterSelect
                label="Status"
                allLabel="All statuses"
                value={(filters.status as string) ?? ''}
                onChange={(val) => setFilter('status', val)}
                options={[
                  { value: 'sent', label: 'Sent (Pending)' },
                  { value: 'accepted', label: 'Accepted' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'expired', label: 'Expired' },
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
            <span className="text-xs font-medium text-ink-500">Pipeline Quoted</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalQuoted, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Accepted Value</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {formatCurrency(acceptedTotal, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Awaiting Decision</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">{pendingCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Acceptance Rate</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {total > 0 ? `${((acceptedQuotes.length / total) * 100).toFixed(0)}%` : '0%'}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {quotations.length === 0 ? (
          <EmptyState
            icon={<IconFileText size={32} />}
            title="No quotations found"
            description="Prepare commercial proposals and price quotes for prospective buyers."
            action={<Button variant="primary" onClick={openCreate}>Create quote</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={quotations} keyField="id" />
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
        title={editingQuote ? `Edit Quote ${editingQuote.quoteNumber}` : 'New Commercial Quotation'}
        description="Configure pricing, validity expiration date, and customer contact."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="quote-form">
              {editingQuote ? 'Save changes' : 'Generate quote'}
            </Button>
          </>
        }
      >
        <form id="quote-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quote #" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Status" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Quotation['status'])}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'accepted', label: 'Accepted' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'expired', label: 'Expired' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Customer / Account Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Nexus Biomed Technologies"
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
            <Field label="Valid Until" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
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

          <Field label="Notes / Commercial Terms">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                placeholder="Discounts applied, payment terms, shipping conditions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Quote ${deleteTarget?.quoteNumber}?`}
        description="Are you sure you want to delete this quotation?"
        confirmLabel="Delete quote"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

