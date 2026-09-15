import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DescriptionItem, DescriptionList } from '@/components/DescriptionList';
import { EmptyState } from '@/components/EmptyState';
import { Tag } from '@/components/Tag';
import { IconChevronLeft, IconTrash } from '@/components/icons';
import {
  initialDocuments,
  initialPurchases,
  initialSupplierPerformance,
  initialSuppliers,
} from '@/data/datasets';
import { useLocalCollection } from '@/data/useLocalCollection';
import type { SupplierRecord } from '@/data/types';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/format';
import { SupplierForm } from './SupplierForm';

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { getItem, updateItem, deleteItem } = useLocalCollection<SupplierRecord>(
    'suppliers',
    initialSuppliers,
  );

  const supplier = getItem(id ?? '');
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!supplier) {
    return (
      <Card>
        <EmptyState
          title="Supplier record not found"
          description="This vendor may have been archived or removed from the directory."
          action={<Button onClick={() => navigate('/crm/suppliers')}>Back to Suppliers</Button>}
        />
      </Card>
    );
  }

  // Linked performance
  const performance = initialSupplierPerformance.find((p) => p.supplierId === supplier.id);

  // Linked purchases
  const purchases = initialPurchases.filter(
    (p) => p.supplierId === supplier.id || p.supplierName.includes(supplier.name.split(' ')[0]),
  );

  // Linked docs
  const documents = initialDocuments.filter((d) =>
    d.relatedEntityName?.toLowerCase().includes(supplier.name.toLowerCase().split(' ')[0]),
  );

  const handleSave = (data: Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    updateItem(supplier.id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDelete = () => {
    deleteItem(supplier.id);
    navigate('/crm/suppliers', { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/crm/suppliers"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <IconChevronLeft size={16} /> All Suppliers
      </Link>

      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-card bg-ink-900 font-display text-lg font-bold text-white">
              {supplier.code.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-ink-900">{supplier.name}</h1>
                <Tag tone="neutral">{supplier.category}</Tag>
              </div>
              <p className="text-sm text-ink-500">
                {supplier.code} · {supplier.city}, {supplier.country}
              </p>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(true)}
              className="text-danger-600 hover:bg-danger-100"
            >
              <IconTrash size={16} />
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              Edit Supplier
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Profile & Commercial Specs */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader title="Commercial Profile" />
            <CardBody>
              <DescriptionList>
                <DescriptionItem label="Contact Representative">
                  <span className="font-medium text-ink-900">{supplier.contactPerson}</span>
                </DescriptionItem>
                <DescriptionItem label="Contact Email">
                  <a href={`mailto:${supplier.email}`} className="text-accent-600 hover:underline">
                    {supplier.email}
                  </a>
                </DescriptionItem>
                <DescriptionItem label="Phone Number">
                  <span className="text-ink-700">{supplier.phone}</span>
                </DescriptionItem>
                <DescriptionItem label="Payment Terms">
                  <span className="font-mono font-medium text-ink-900">{supplier.paymentTerms}</span>
                </DescriptionItem>
                <DescriptionItem label="Facility Location">
                  <span className="text-ink-700">
                    {supplier.city}, {supplier.country}
                  </span>
                </DescriptionItem>
                <DescriptionItem label="Reliability Rating">
                  <span className="font-mono font-bold text-positive-600">
                    ★ {supplier.rating.toFixed(1)} / 5.0
                  </span>
                </DescriptionItem>
                <DescriptionItem label="Active Supply Contracts">
                  <span className="font-semibold text-ink-900">
                    {supplier.activeContracts} ongoing agreements
                  </span>
                </DescriptionItem>
              </DescriptionList>
            </CardBody>
          </Card>

          {/* Linked Purchase Orders */}
          <Card className="overflow-hidden">
            <CardHeader
              title={`Purchase Orders (${purchases.length})`}
              action={
                <Link
                  to="/commerce/purchases"
                  className="text-xs font-medium text-ink-500 hover:text-ink-900"
                >
                  Purchases Hub →
                </Link>
              }
            />
            {purchases.length === 0 ? (
              <CardBody>
                <EmptyState
                  size="sm"
                  title="No purchase orders"
                  description="No purchase history recorded for this vendor."
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {purchases.map((po) => (
                  <li key={po.id} className="flex items-center justify-between p-3 hover:bg-surface-sunken/40">
                    <div>
                      <p className="font-semibold text-ink-900">{po.poNumber}</p>
                      <p className="text-2xs text-ink-500">Ordered {formatDate(po.orderDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-ink-900">
                        {formatCurrency(po.total, po.currency)}
                      </p>
                      <Tag
                        tone={
                          po.status === 'received'
                            ? 'positive'
                            : po.status === 'ordered'
                              ? 'accent'
                              : 'neutral'
                        }
                      >
                        {po.status}
                      </Tag>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Vendor Scorecard & Documents */}
        <div className="flex flex-col gap-5 lg:col-span-1">
          {performance && (
            <Card>
              <CardHeader title="Vendor Scorecard" />
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded bg-surface-sunken p-2.5">
                  <span className="text-xs text-ink-700">On-Time Delivery</span>
                  <span className="font-mono font-bold text-positive-600">
                    {performance.onTimeDeliveryRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded bg-surface-sunken p-2.5">
                  <span className="text-xs text-ink-700">Quality Acceptance</span>
                  <span className="font-mono font-bold text-positive-600">
                    {performance.qualityAcceptanceRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded bg-surface-sunken p-2.5">
                  <span className="text-xs text-ink-700">Average Lead Time</span>
                  <span className="font-mono font-semibold text-ink-900">
                    {performance.averageLeadDays} days
                  </span>
                </div>
                <div className="flex items-center justify-between rounded bg-surface-sunken p-2.5">
                  <span className="text-xs text-ink-700">Risk Assessment</span>
                  <Tag
                    tone={
                      performance.riskLevel === 'low'
                        ? 'positive'
                        : performance.riskLevel === 'medium'
                          ? 'warn'
                          : 'danger'
                    }
                  >
                    {performance.riskLevel} risk
                  </Tag>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Legal Documents */}
          <Card>
            <CardHeader title={`Vendor Contracts (${documents.length})`} />
            <CardBody className="flex flex-col gap-2">
              {documents.length === 0 ? (
                <p className="text-xs text-ink-500">No contracts uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="rounded border border-ink-100 p-2.5 text-xs">
                    <p className="font-medium text-ink-900">{doc.title}</p>
                    <p className="text-2xs text-ink-300">
                      {doc.fileName} · {doc.fileSize}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <SupplierForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        supplier={supplier}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Supplier"
        description={`Are you sure you want to delete ${supplier.name}?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
