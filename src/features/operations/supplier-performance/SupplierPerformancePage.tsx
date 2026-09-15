import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { IconActivity, IconEdit, IconPlus, IconTrash } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialSupplierPerformance } from '@/data/datasets';
import type { SupplierPerformance } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, pluralize } from '@/lib/format';
import { useState } from 'react';

const RATING_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  A: 'success',
  B: 'accent',
  C: 'warn',
  D: 'danger',
};

export function SupplierPerformancePage() {
  const {
    items: performances,
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
  } = useLocalCollection<SupplierPerformance>({
    collectionKey: 'supplier-performance',
    initialData: initialSupplierPerformance,
    defaultSort: { field: 'onTimeDeliveryRate', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingScorecard, setEditingScorecard] = useState<SupplierPerformance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierPerformance | null>(null);

  // Form fields
  const [supplierName, setSupplierName] = useState('');
  const [period, setPeriod] = useState('2024-Q3');
  const [onTimeDeliveryRate, setOnTimeDeliveryRate] = useState('95');
  const [qualityScore, setQualityScore] = useState('98');
  const [leadTimeDays, setLeadTimeDays] = useState('14');
  const [defectRate, setDefectRate] = useState('1.2');
  const [spend, setSpend] = useState('150000');
  const [rating, setRating] = useState<SupplierPerformance['rating']>('A');

  const openCreate = () => {
    setEditingScorecard(null);
    setSupplierName('');
    setPeriod('2024-Q3');
    setOnTimeDeliveryRate('96.5');
    setQualityScore('98.0');
    setLeadTimeDays('12');
    setDefectRate('0.8');
    setSpend('120000');
    setRating('A');
    setDrawerOpen(true);
  };

  const openEdit = (sp: SupplierPerformance) => {
    setEditingScorecard(sp);
    setSupplierName(sp.supplierName);
    setPeriod(sp.period);
    setOnTimeDeliveryRate(String(sp.onTimeDeliveryRate));
    setQualityScore(String(sp.qualityScore));
    setLeadTimeDays(String(sp.leadTimeDays));
    setDefectRate(String(sp.defectRate));
    setSpend(String(sp.spend));
    setRating(sp.rating);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    const payload = {
      supplierId: editingScorecard?.supplierId ?? 'supp_gen',
      supplierName: supplierName.trim(),
      period: period.trim(),
      onTimeDeliveryRate: parseFloat(onTimeDeliveryRate) || 0,
      qualityScore: parseFloat(qualityScore) || 0,
      leadTimeDays: parseInt(leadTimeDays, 10) || 0,
      defectRate: parseFloat(defectRate) || 0,
      spend: parseFloat(spend) || 0,
      rating,
    };

    if (editingScorecard) {
      await update(editingScorecard.id, payload);
      toast.success(`Scorecard for ${payload.supplierName} updated`);
    } else {
      await create(payload);
      toast.success(`Scorecard for ${payload.supplierName} created`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Scorecard for ${deleteTarget.supplierName} deleted`);
    setDeleteTarget(null);
  };

  const totalSpend = performances.reduce((acc, p) => acc + p.spend, 0);
  const avgOtd =
    performances.length > 0
      ? performances.reduce((acc, p) => acc + p.onTimeDeliveryRate, 0) / performances.length
      : 0;
  const avgQuality =
    performances.length > 0
      ? performances.reduce((acc, p) => acc + p.qualityScore, 0) / performances.length
      : 0;
  const tierACount = performances.filter((p) => p.rating === 'A').length;

  const columns: Column<SupplierPerformance>[] = [
    {
      id: 'vendor',
      header: 'Supplier & Period',
      cell: (sp) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink-900">{sp.supplierName}</span>
          <span className="text-xs text-ink-400">{sp.period}</span>
        </div>
      ),
    },
    {
      id: 'rating',
      header: 'Tier Rating',
      cell: (sp) => (
        <Tag tone={RATING_TONES[sp.rating] ?? 'neutral'}>
          Tier {sp.rating}
        </Tag>
      ),
    },
    {
      id: 'otd',
      header: 'On-Time Delivery',
      align: 'right',
      cell: (sp) => {
        const isGood = sp.onTimeDeliveryRate >= 92;
        return (
          <span
            className={`font-mono text-xs font-semibold ${
              isGood ? 'text-emerald-600' : 'text-danger-600'
            }`}
          >
            {sp.onTimeDeliveryRate.toFixed(1)}%
          </span>
        );
      },
    },
    {
      id: 'quality',
      header: 'Quality Acceptance',
      align: 'right',
      cell: (sp) => (
        <span className="font-mono text-xs font-medium text-ink-900">
          {sp.qualityScore.toFixed(1)}%
        </span>
      ),
    },
    {
      id: 'leadTime',
      header: 'Lead Time',
      align: 'right',
      cell: (sp) => (
        <span className="font-mono text-xs text-ink-700">{sp.leadTimeDays} days</span>
      ),
    },
    {
      id: 'defect',
      header: 'Defect Rate',
      align: 'right',
      cell: (sp) => {
        const highDefect = sp.defectRate > 2.0;
        return (
          <span
            className={`font-mono text-xs ${
              highDefect ? 'font-semibold text-danger-600' : 'text-ink-600'
            }`}
          >
            {sp.defectRate.toFixed(2)}%
          </span>
        );
      },
    },
    {
      id: 'spend',
      header: 'Total Spend',
      align: 'right',
      cell: (sp) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(sp.spend, 'USD')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (sp) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(sp)}
            aria-label={`Edit ${sp.supplierName}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(sp)}
            aria-label={`Delete ${sp.supplierName}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Supplier Performance & Scorecards"
        meta={`${pluralize(total, 'vendor scorecard')} tracked · ${formatCurrency(totalSpend, 'USD')} spend analyzed`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            Add scorecard
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search vendor name, evaluation period…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <FilterSelect
                label="Rating"
                allLabel="All tiers"
                value={(filters.rating as string) ?? ''}
                onChange={(val) => setFilter('rating', val)}
                options={[
                  { value: 'A', label: 'Tier A (Excellent)' },
                  { value: 'B', label: 'Tier B (Standard)' },
                  { value: 'C', label: 'Tier C (Needs Improvement)' },
                  { value: 'D', label: 'Tier D (High Risk)' },
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
            <span className="text-xs font-medium text-ink-500">Fleet On-Time Delivery</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {avgOtd.toFixed(1)}%
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Average Quality Score</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {avgQuality.toFixed(1)}%
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Tier A Elite Vendors</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">{tierACount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Procurement Volume</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {formatCurrency(totalSpend, 'USD')}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {performances.length === 0 ? (
          <EmptyState
            icon={<IconActivity size={32} />}
            title="No supplier scorecards found"
            description="Evaluate vendor fulfillment reliability, quality conformity, and lead times."
            action={<Button variant="primary" onClick={openCreate}>Add scorecard</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={performances} keyField="id" />
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
        title={editingScorecard ? `Edit ${editingScorecard.supplierName}` : 'Add Supplier Scorecard'}
        description="Record quarterly KPIs for supplier reliability, defect metrics, and delivery rate."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="score-form">
              {editingScorecard ? 'Save changes' : 'Save scorecard'}
            </Button>
          </>
        }
      >
        <form id="score-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Supplier Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Ampere Optics Ltd"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Evaluation Period" required>
              {({ id }) => (
                <Input
                  id={id}
                  placeholder="2024-Q3"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Tier Rating" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={rating}
                  onChange={(e) => setRating(e.target.value as SupplierPerformance['rating'])}
                  options={[
                    { value: 'A', label: 'Tier A (Elite)' },
                    { value: 'B', label: 'Tier B (Standard)' },
                    { value: 'C', label: 'Tier C (Needs Improvement)' },
                    { value: 'D', label: 'Tier D (High Risk)' },
                  ]}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="On-Time Delivery (%)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  step="0.1"
                  value={onTimeDeliveryRate}
                  onChange={(e) => setOnTimeDeliveryRate(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Quality Score (%)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  step="0.1"
                  value={qualityScore}
                  onChange={(e) => setQualityScore(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lead Time (Days)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Defect Rate (%)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  step="0.01"
                  value={defectRate}
                  onChange={(e) => setDefectRate(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <Field label="Quarterly Spend ($)" required>
            {({ id }) => (
              <Input
                id={id}
                type="number"
                value={spend}
                onChange={(e) => setSpend(e.target.value)}
                required
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Scorecard for ${deleteTarget?.supplierName}?`}
        description="Are you sure you want to remove this scorecard evaluation?"
        confirmLabel="Delete scorecard"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

