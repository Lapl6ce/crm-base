import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { IconEdit, IconPlus, IconTrash, IconTruck } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialShipments } from '@/data/datasets';
import type { Shipment } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  pending: 'neutral',
  in_transit: 'accent',
  customs_hold: 'danger',
  delivered: 'success',
  returned: 'warn',
};

const NEXT_STATUS: Partial<Record<Shipment['status'], Shipment['status'] | null>> = {
  pending: 'in_transit',
  in_transit: 'delivered',
  customs_hold: 'in_transit',
  delivered: null,
  returned: null,
};

export function ShipmentsPage() {
  const {
    items: shipments,
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
  } = useLocalCollection<Shipment>({
    collectionKey: 'shipments',
    initialData: initialShipments,
    defaultSort: { field: 'estimatedDelivery', dir: 'asc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null);

  // Form fields
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('FedEx Freight');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [status, setStatus] = useState<Shipment['status']>('in_transit');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

  const openCreate = () => {
    setEditingShipment(null);
    setTrackingNumber(`SHP-2024-${Math.floor(1000 + Math.random() * 9000)}`);
    setCarrier('FedEx Freight');
    setOrigin('Chicago Hub');
    setDestination('');
    setStatus('in_transit');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    setEstimatedDelivery(futureDate.toISOString().split('T')[0]);
    setDrawerOpen(true);
  };

  const openEdit = (shp: Shipment) => {
    setEditingShipment(shp);
    setTrackingNumber(shp.trackingNumber);
    setCarrier(shp.carrier);
    setOrigin(shp.origin);
    setDestination(shp.destination);
    setStatus(shp.status);
    setEstimatedDelivery(shp.estimatedDelivery ? shp.estimatedDelivery.split('T')[0] : '');
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim() || !origin.trim() || !destination.trim()) {
      toast.error('Tracking #, Origin, and Destination are required');
      return;
    }

    const payload = {
      trackingNumber: trackingNumber.trim(),
      carrier,
      origin: origin.trim(),
      destination: destination.trim(),
      status,
      estimatedDelivery: estimatedDelivery
        ? new Date(estimatedDelivery).toISOString()
        : new Date().toISOString(),
    };

    if (editingShipment) {
      await update(editingShipment.id, payload);
      toast.success(`Shipment ${payload.trackingNumber} updated`);
    } else {
      await create(payload);
      toast.success(`Shipment ${payload.trackingNumber} registered`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Shipment ${deleteTarget.trackingNumber} deleted`);
    setDeleteTarget(null);
  };

  const handleAdvanceStatus = async (shp: Shipment) => {
    const next = NEXT_STATUS[shp.status];
    if (!next) return;
    const patch: Partial<Shipment> = { status: next };
    if (next === 'delivered') {
      patch.actualDelivery = new Date().toISOString();
    }
    await update(shp.id, patch);
    toast.success(`Shipment ${shp.trackingNumber} updated to ${next.toUpperCase()}`);
  };

  const inTransitCount = shipments.filter((s) => s.status === 'in_transit').length;
  const customsHoldCount = shipments.filter((s) => s.status === 'customs_hold').length;
  const deliveredCount = shipments.filter((s) => s.status === 'delivered').length;

  const columns: Column<Shipment>[] = [
    {
      id: 'tracking',
      header: 'Tracking #',
      cell: (s) => (
        <span className="font-mono text-xs font-semibold text-accent-700">{s.trackingNumber}</span>
      ),
    },
    {
      id: 'carrier',
      header: 'Carrier',
      cell: (s) => <span className="font-medium text-ink-900">{s.carrier}</span>,
    },
    {
      id: 'route',
      header: 'Route (Origin → Destination)',
      cell: (s) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-ink-600">{s.origin}</span>
          <span className="text-ink-400">→</span>
          <span className="font-medium text-ink-900">{s.destination}</span>
        </div>
      ),
    },
    {
      id: 'eta',
      header: 'ETA / Arrival',
      cell: (s) => (
        <div className="flex flex-col text-xs">
          <span className="text-ink-900">{formatDate(s.estimatedDelivery)}</span>
          {s.actualDelivery && (
            <span className="text-emerald-600 font-medium">Delivered: {formatDate(s.actualDelivery)}</span>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (s) => (
        <Tag tone={STATUS_TONES[s.status] ?? 'neutral'}>
          {s.status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (s) => {
        const next = NEXT_STATUS[s.status];
        return (
          <div className="flex items-center justify-end gap-1">
            {next && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAdvanceStatus(s)}
              >
                Mark {next.replace('_', ' ')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              icon={<IconEdit size={14} />}
              onClick={() => openEdit(s)}
              aria-label={`Edit ${s.trackingNumber}`}
            />
            <Button
              size="sm"
              variant="ghost"
              icon={<IconTrash size={14} />}
              onClick={() => setDeleteTarget(s)}
              aria-label={`Delete ${s.trackingNumber}`}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Shipments & Logistics"
        meta={`${pluralize(total, 'consignment')} dispatched · ${inTransitCount} currently in transit`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            New shipment
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search tracking #, origin, destination…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <FilterSelect
                label="Status"
                allLabel="All shipment statuses"
                value={(filters.status as string) ?? ''}
                onChange={(val) => setFilter('status', val)}
                options={[
                  { value: 'in_transit', label: 'In Transit' },
                  { value: 'customs_hold', label: 'Customs Hold' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'returned', label: 'Returned' },
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
            <span className="text-xs font-medium text-ink-500">Total Dispatches</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">{total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">In Transit</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">{inTransitCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Customs Holds</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${customsHoldCount > 0 ? 'text-danger-600' : 'text-ink-900'}`}>
              {customsHoldCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Successfully Delivered</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {deliveredCount}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {shipments.length === 0 ? (
          <EmptyState
            icon={<IconTruck size={32} />}
            title="No shipments found"
            description="Track inbound freight and customer outbound carrier deliveries."
            action={<Button variant="primary" onClick={openCreate}>New shipment</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={shipments} keyField="id" />
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
        title={editingShipment ? `Edit Shipment ${editingShipment.trackingNumber}` : 'Register Shipment'}
        description="Dispatch consignment details, carrier assignation, and destination routing."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="ship-form">
              {editingShipment ? 'Save changes' : 'Dispatch shipment'}
            </Button>
          </>
        }
      >
        <form id="ship-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tracking Number" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Carrier" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  options={[
                    { value: 'FedEx Freight', label: 'FedEx Freight' },
                    { value: 'DHL Express', label: 'DHL Express' },
                    { value: 'UPS Worldwide', label: 'UPS Worldwide' },
                    { value: 'Pacific Freight Express', label: 'Pacific Freight' },
                    { value: 'Maersk Logistics', label: 'Maersk Logistics' },
                  ]}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin Location" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Destination Location" required>
              {({ id }) => (
                <Input
                  id={id}
                  placeholder="e.g. Frankfurt Central Facility"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Shipment['status'])}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'in_transit', label: 'In Transit' },
                    { value: 'customs_hold', label: 'Customs Hold' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'returned', label: 'Returned' },
                  ]}
                />
              )}
            </Field>

            <Field label="Estimated Delivery Date" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Shipment ${deleteTarget?.trackingNumber}?`}
        description="Are you sure you want to remove this shipment record?"
        confirmLabel="Delete shipment"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
