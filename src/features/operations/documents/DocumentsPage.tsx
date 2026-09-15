import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { IconFileText, IconPlus, IconTrash } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialDocuments } from '@/data/datasets';
import type { CrmDocument } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const CATEGORY_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  contract: 'accent',
  compliance: 'success',
  invoice: 'neutral',
  specification: 'warn',
  other: 'neutral',
};

export function DocumentsPage() {
  const { user } = useSession();
  const {
    items: documents,
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
    remove,
  } = useLocalCollection<CrmDocument>({
    collectionKey: 'documents',
    initialData: initialDocuments,
    defaultSort: { field: 'uploadedAt', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CrmDocument | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CrmDocument['category']>('contract');
  const [relatedType, setRelatedType] = useState<CrmDocument['relatedType']>('customer');
  const [relatedName, setRelatedName] = useState('');
  const [fileSize, setFileSize] = useState('1.8 MB');

  const openUpload = () => {
    setName('');
    setCategory('contract');
    setRelatedType('customer');
    setRelatedName('');
    setFileSize('2.4 MB');
    setDrawerOpen(true);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Document title is required');
      return;
    }

    await create({
      name: name.trim(),
      category,
      relatedType,
      relatedName: relatedName.trim() || undefined,
      fileSize,
      uploadedBy: user?.name ?? 'Admin',
      uploadedAt: new Date().toISOString(),
      url: '#',
    });

    toast.success(`Document "${name}" uploaded to vault`);
    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Document "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  const handleDownload = (doc: CrmDocument) => {
    toast.success(`Downloading ${doc.name} (${doc.fileSize})...`);
  };

  const contractCount = documents.filter((d) => d.category === 'contract').length;
  const complianceCount = documents.filter((d) => d.category === 'compliance').length;
  const invoiceCount = documents.filter((d) => d.category === 'invoice').length;

  const columns: Column<CrmDocument>[] = [
    {
      id: 'name',
      header: 'Document Name',
      cell: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-sunken text-ink-600">
            <IconFileText size={16} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-ink-900 hover:text-accent-600 cursor-pointer" onClick={() => handleDownload(d)}>
              {d.name}
            </span>
            <span className="font-mono text-[11px] text-ink-400">{d.fileSize}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: (d) => (
        <Tag tone={CATEGORY_TONES[d.category] ?? 'neutral'}>
          {d.category.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'association',
      header: 'Linked Record',
      cell: (d) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-ink-800">{d.relatedName ?? 'General'}</span>
          <span className="capitalize text-ink-400">({d.relatedType})</span>
        </div>
      ),
    },
    {
      id: 'uploaded',
      header: 'Uploaded Date',
      cell: (d) => (
        <div className="flex flex-col text-xs text-ink-600">
          <span>{formatDate(d.uploadedAt)}</span>
          <span className="text-ink-400">by {d.uploadedBy}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (d) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="secondary" onClick={() => handleDownload(d)}>
            Download
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(d)}
            aria-label={`Delete ${d.name}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Document Management Vault"
        meta={`${pluralize(total, 'file')} stored · Cloud compliance repository`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openUpload}>
            Upload document
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search documents, entities, file names…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <FilterSelect
                label="Category"
                allLabel="All categories"
                value={(filters.category as string) ?? ''}
                onChange={(val) => setFilter('category', val)}
                options={[
                  { value: 'contract', label: 'Contracts & NDAs' },
                  { value: 'compliance', label: 'Compliance & Audits' },
                  { value: 'specification', label: 'Technical Specs' },
                  { value: 'invoice', label: 'Invoices & Receipts' },
                  { value: 'other', label: 'General Documentation' },
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
            <span className="text-xs font-medium text-ink-500">Total Files</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">{total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Active Contracts</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">{contractCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Compliance & Audits</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">{complianceCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Billing Docs</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">{invoiceCount}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {documents.length === 0 ? (
          <EmptyState
            icon={<IconFileText size={32} />}
            title="No documents uploaded"
            description="Store master service agreements, vendor compliance sheets, and invoices securely."
            action={<Button variant="primary" onClick={openUpload}>Upload document</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={documents} keyField="id" />
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
        title="Upload Document"
        description="Index a contract, invoice, or technical sheet in the central vault."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="doc-form">
              Save to vault
            </Button>
          </>
        }
      >
        <form id="doc-form" onSubmit={handleUpload} className="flex flex-col gap-4">
          <Field label="Document Title" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Master Services Agreement 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CrmDocument['category'])}
                  options={[
                    { value: 'contract', label: 'Contract / NDA' },
                    { value: 'compliance', label: 'Compliance / SOC2' },
                    { value: 'specification', label: 'Technical Spec' },
                    { value: 'invoice', label: 'Invoice / Billing' },
                    { value: 'other', label: 'Other Document' },
                  ]}
                />
              )}
            </Field>

            <Field label="Simulated File Size">
              {({ id }) => (
                <Input
                  id={id}
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Associated Entity Type" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={relatedType}
                  onChange={(e) => setRelatedType(e.target.value as CrmDocument['relatedType'])}
                  options={[
                    { value: 'customer', label: 'Customer' },
                    { value: 'supplier', label: 'Supplier' },
                    { value: 'deal', label: 'Deal' },
                    { value: 'general', label: 'General / Company' },
                  ]}
                />
              )}
            </Field>

            <Field label="Linked Party / Account Name">
              {({ id }) => (
                <Input
                  id={id}
                  placeholder="e.g. Vertex Global"
                  value={relatedName}
                  onChange={(e) => setRelatedName(e.target.value)}
                />
              )}
            </Field>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Document "${deleteTarget?.name}"?`}
        description="Are you sure you want to permanently delete this document from the vault?"
        confirmLabel="Delete document"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

