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
import { initialExpenses } from '@/data/datasets';
import type { Expense } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  approved: 'success',
  pending: 'warn',
  rejected: 'danger',
};

export function ExpensesPage() {
  const { user } = useSession();
  const {
    items: expenses,
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
  } = useLocalCollection<Expense>({
    collectionKey: 'expenses',
    initialData: initialExpenses,
    defaultSort: { field: 'date', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Software');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [approvedBy, setApprovedBy] = useState('');
  const [status, setStatus] = useState<Expense['status']>('pending');
  const [receiptAttached, setReceiptAttached] = useState(true);

  const openCreate = () => {
    setEditingExpense(null);
    setTitle('');
    setCategory('Software & Subscriptions');
    setAmount('1200');
    setCurrency('USD');
    setApprovedBy('');
    setStatus('pending');
    setReceiptAttached(true);
    setDrawerOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(String(exp.amount));
    setCurrency(exp.currency);
    setApprovedBy(exp.approvedBy || '');
    setStatus(exp.status);
    setReceiptAttached(exp.receiptAttached);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Expense title is required');
      return;
    }

    const payload = {
      title: title.trim(),
      category: category.trim(),
      amount: parseFloat(amount) || 0,
      currency,
      date: editingExpense?.date ?? new Date().toISOString(),
      approvedBy: approvedBy.trim() || undefined,
      status,
      receiptAttached,
    };

    if (editingExpense) {
      await update(editingExpense.id, payload);
      toast.success(`Expense "${payload.title}" updated`);
    } else {
      await create(payload);
      toast.success(`Expense "${payload.title}" recorded`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Expense "${deleteTarget.title}" deleted`);
    setDeleteTarget(null);
  };

  const handleApprove = async (exp: Expense) => {
    await update(exp.id, {
      status: 'approved',
      approvedBy: user?.name ?? 'Admin',
    });
    toast.success(`Expense "${exp.title}" approved`);
  };

  const totalSpend = expenses.reduce((acc, e) => acc + e.amount, 0);
  const approvedTotal = expenses
    .filter((e) => e.status === 'approved')
    .reduce((acc, e) => acc + e.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === 'pending').length;

  const columns: Column<Expense>[] = [
    {
      id: 'title',
      header: 'Expense Item & Category',
      cell: (e) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink-900">{e.title}</span>
          <span className="text-xs text-ink-500">{e.category}</span>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (e) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(e.amount, e.currency)}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      cell: (e) => <span className="text-xs text-ink-600">{formatDate(e.date)}</span>,
    },
    {
      id: 'receipt',
      header: 'Receipt',
      cell: (e) => (
        <span className={`text-xs ${e.receiptAttached ? 'text-emerald-600 font-medium' : 'text-ink-400'}`}>
          {e.receiptAttached ? '✓ Attached' : 'Missing'}
        </span>
      ),
    },
    {
      id: 'approvedBy',
      header: 'Approver',
      cell: (e) => (
        <span className="text-xs text-ink-700">{e.approvedBy ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (e) => (
        <Tag tone={STATUS_TONES[e.status] ?? 'neutral'}>
          {e.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (e) => (
        <div className="flex items-center justify-end gap-1">
          {e.status === 'pending' && (
            <Button
              size="sm"
              variant="secondary"
              icon={<IconCheckCircle size={14} />}
              onClick={() => handleApprove(e)}
            >
              Approve
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(e)}
            aria-label={`Edit ${e.title}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(e)}
            aria-label={`Delete ${e.title}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Internal Expenses"
        meta={`${pluralize(total, 'expense')} filed · ${formatCurrency(totalSpend, 'USD')} total claimed`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            New expense
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search expense item, category, approver…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <FilterSelect
                label="Status"
                allLabel="All statuses"
                value={(filters.status as string) ?? ''}
                onChange={(val) => setFilter('status', val)}
                options={[
                  { value: 'pending', label: 'Pending Approval' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
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
            <span className="text-xs font-medium text-ink-500">Total Claimed</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalSpend, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Approved Spend</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {formatCurrency(approvedTotal, 'USD')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Awaiting Approval</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-ink-900'}`}>
              {pendingCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Receipt Compliance</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {total > 0
                ? `${((expenses.filter((e) => e.receiptAttached).length / total) * 100).toFixed(0)}%`
                : '100%'}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {expenses.length === 0 ? (
          <EmptyState
            icon={<IconDollar size={32} />}
            title="No expenses submitted"
            description="Submit internal operational expenses, travel vouchers, and software licenses."
            action={<Button variant="primary" onClick={openCreate}>New expense</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={expenses} keyField="id" />
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
        title={editingExpense ? `Edit ${editingExpense.title}` : 'File Expense'}
        description="Claim reimbursement or record internal operational expense."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="exp-form">
              {editingExpense ? 'Save changes' : 'Submit expense'}
            </Button>
          </>
        }
      >
        <form id="exp-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Expense Title" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. AWS Production Infrastructure Aug"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                  { value: 'Software & Cloud', label: 'Software & Cloud' },
                  { value: 'Travel & Lodging', label: 'Travel & Lodging' },
                  { value: 'Marketing & Events', label: 'Marketing & Events' },
                  { value: 'Office & Facilities', label: 'Office & Facilities' },
                  { value: 'Legal & Professional', label: 'Legal & Professional' },
                ]}
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

          <Field label="Status" required>
            {({ id }) => (
              <Select
                id={id}
                value={status}
                onChange={(e) => setStatus(e.target.value as Expense['status'])}
                options={[
                  { value: 'pending', label: 'Pending Approval' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
              />
            )}
          </Field>

          <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
            <input
              type="checkbox"
              checked={receiptAttached}
              onChange={(e) => setReceiptAttached(e.target.checked)}
              className="rounded border-ink-300 text-accent-600 focus:ring-accent-500"
            />
            Receipt receipt voucher verified & attached
          </label>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Expense "${deleteTarget?.title}"?`}
        description="Are you sure you want to delete this expense record?"
        confirmLabel="Delete expense"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

