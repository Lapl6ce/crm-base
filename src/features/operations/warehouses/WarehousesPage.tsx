import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { IconEdit, IconPlus, IconTrash, IconWarehouse } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialWarehouses } from '@/data/datasets';
import type { Warehouse } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { pluralize } from '@/lib/format';
import { useState } from 'react';

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  active: 'success',
  maintenance: 'warn',
  full: 'danger',
};

export function WarehousesPage() {
  const {
    items: warehouses,
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
  } = useLocalCollection<Warehouse>({
    collectionKey: 'warehouses',
    initialData: initialWarehouses,
    defaultSort: { field: 'name', dir: 'asc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [capacityUnits, setCapacityUnits] = useState('50000');
  const [utilizedUnits, setUtilizedUnits] = useState('20000');
  const [status, setStatus] = useState<Warehouse['status']>('active');

  const openCreate = () => {
    setEditingWarehouse(null);
    setCode(`WH-${Math.floor(10 + Math.random() * 90)}`);
    setName('');
    setLocation('');
    setManager('');
    setCapacityUnits('75000');
    setUtilizedUnits('25000');
    setStatus('active');
    setDrawerOpen(true);
  };

  const openEdit = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setCode(wh.code);
    setName(wh.name);
    setLocation(wh.location);
    setManager(wh.manager);
    setCapacityUnits(String(wh.capacityUnits));
    setUtilizedUnits(String(wh.utilizedUnits));
    setStatus(wh.status);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !location.trim()) {
      toast.error('Code, Name, and Location are required');
      return;
    }

    const payload = {
      code: code.trim(),
      name: name.trim(),
      location: location.trim(),
      manager: manager.trim() || 'Unassigned',
      capacityUnits: parseInt(capacityUnits, 10) || 10000,
      utilizedUnits: parseInt(utilizedUnits, 10) || 0,
      status,
    };

    if (editingWarehouse) {
      await update(editingWarehouse.id, payload);
      toast.success(`Warehouse ${payload.name} updated`);
    } else {
      await create(payload);
      toast.success(`Warehouse ${payload.name} created`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Warehouse ${deleteTarget.name} removed`);
    setDeleteTarget(null);
  };

  const totalCapacity = warehouses.reduce((acc, w) => acc + w.capacityUnits, 0);
  const totalUtilized = warehouses.reduce((acc, w) => acc + w.utilizedUnits, 0);
  const overallUtilization = totalCapacity > 0 ? (totalUtilized / totalCapacity) * 100 : 0;

  const columns: Column<Warehouse>[] = [
    {
      id: 'code',
      header: 'Code',
      cell: (w) => <span className="font-mono text-xs font-semibold text-ink-700">{w.code}</span>,
    },
    {
      id: 'name',
      header: 'Warehouse & Location',
      cell: (w) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink-900">{w.name}</span>
          <span className="text-xs text-ink-500">{w.location}</span>
        </div>
      ),
    },
    {
      id: 'manager',
      header: 'Facility Manager',
      cell: (w) => <span className="text-xs font-medium text-ink-700">{w.manager}</span>,
    },
    {
      id: 'utilization',
      header: 'Capacity Utilization',
      cell: (w) => {
        const pct = w.capacityUnits > 0 ? (w.utilizedUnits / w.capacityUnits) * 100 : 0;
        const isHigh = pct >= 85;
        return (
          <div className="flex w-44 flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="font-mono font-medium text-ink-800">{pct.toFixed(0)}%</span>
              <span className="text-ink-400">
                {w.utilizedUnits.toLocaleString()} / {w.capacityUnits.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-sunken">
              <div
                className={`h-1.5 rounded-full ${isHigh ? 'bg-amber-500' : 'bg-accent-500'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: (w) => (
        <Tag tone={STATUS_TONES[w.status] ?? 'neutral'}>
          {w.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (w) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(w)}
            aria-label={`Edit ${w.name}`}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(w)}
            aria-label={`Delete ${w.name}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Warehouses & Logistics Hubs"
        meta={`${pluralize(total, 'facility')} · ${overallUtilization.toFixed(0)}% fleet capacity utilization`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            Add warehouse
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by facility code, name, city…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <FilterSelect
                label="Status"
                allLabel="All statuses"
                value={(filters.status as string) ?? ''}
                onChange={(val) => setFilter('status', val)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'full', label: 'At Capacity' },
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
            <span className="text-xs font-medium text-ink-500">Active Facilities</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">{total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Fleet Capacity</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              {totalCapacity.toLocaleString()} <span className="text-sm font-normal text-ink-500">units</span>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Units Utilized</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">
              {totalUtilized.toLocaleString()} <span className="text-sm font-normal text-ink-500">units</span>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Average Utilization</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {overallUtilization.toFixed(1)}%
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {warehouses.length === 0 ? (
          <EmptyState
            icon={<IconWarehouse size={32} />}
            title="No warehouses configured"
            description="Add distribution hubs, regional warehouses, and storage depots."
            action={<Button variant="primary" onClick={openCreate}>Add warehouse</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={warehouses} keyField="id" />
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
        title={editingWarehouse ? `Edit ${editingWarehouse.name}` : 'New Warehouse Facility'}
        description="Register a storage depot, manage capacity limits and manager assignment."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="wh-form">
              {editingWarehouse ? 'Save changes' : 'Add facility'}
            </Button>
          </>
        }
      >
        <form id="wh-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Facility Code" required>
              {({ id }) => (
                <Input
                  id={id}
                  placeholder="e.g. WH-ORD-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Status" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Warehouse['status'])}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'full', label: 'Full / At Capacity' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Warehouse Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="Midwest Regional Distribution Center"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Location / City, State" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="Chicago, IL"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Facility Manager">
            {({ id }) => (
              <Input
                id={id}
                placeholder="Manager full name"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Capacity (Units)" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  value={capacityUnits}
                  onChange={(e) => setCapacityUnits(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Utilized Units" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  value={utilizedUnits}
                  onChange={(e) => setUtilizedUnits(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name}?`}
        description="Are you sure you want to remove this warehouse record?"
        confirmLabel="Delete facility"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

