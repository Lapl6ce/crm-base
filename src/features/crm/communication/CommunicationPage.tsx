import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/Field';
import {
    IconMessage,
    IconPlus,
    IconTrash,
} from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialCommunications } from '@/data/datasets';
import type { CommunicationLog } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

const TYPE_LABELS: Record<string, string> = {
  call: 'Phone Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Internal Note',
  sms: 'SMS',
};

const TYPE_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  call: 'accent',
  email: 'neutral',
  meeting: 'warn',
  note: 'neutral',
  sms: 'success',
};

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warn' | 'danger'> = {
  completed: 'success',
  scheduled: 'accent',
  missed: 'danger',
  draft: 'neutral',
};

export function CommunicationPage() {
  const { user } = useSession();
  const {
    items: communications,
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
  } = useLocalCollection<CommunicationLog>({
    collectionKey: 'communications',
    initialData: initialCommunications,
    defaultSort: { field: 'date', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommunicationLog | null>(null);

  // Form state
  const [type, setType] = useState<CommunicationLog['type']>('email');
  const [direction, setDirection] = useState<CommunicationLog['direction']>('outbound');
  const [status, setStatus] = useState<CommunicationLog['status']>('completed');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const resetForm = () => {
    setType('email');
    setDirection('outbound');
    setStatus('completed');
    setSubject('');
    setSummary('');
    setContactName('');
    setCompanyName('');
    setContactEmail('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !contactName.trim()) {
      toast.error('Subject and Contact Name are required.');
      return;
    }

    await create({
      type,
      direction,
      status,
      subject: subject.trim(),
      summary: summary.trim(),
      contactName: contactName.trim(),
      companyName: companyName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      userName: user?.name ?? 'User',
      date: new Date().toISOString(),
    });

    toast.success('Communication logged successfully');
    setDrawerOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success('Communication log deleted');
    setDeleteTarget(null);
  };

  const columns: Column<CommunicationLog>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: (comm) => (
        <div className="flex items-center gap-2">
          <Tag tone={TYPE_TONES[comm.type] ?? 'neutral'}>
            {TYPE_LABELS[comm.type] ?? comm.type}
          </Tag>
          <span className="text-xs capitalize text-ink-500">({comm.direction})</span>
        </div>
      ),
    },
    {
      id: 'subject',
      header: 'Subject & Details',
      cell: (comm) => (
        <div className="flex max-w-md flex-col">
          <span className="font-medium text-ink-900">{comm.subject}</span>
          <span className="line-clamp-1 text-xs text-ink-500">{comm.summary}</span>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact / Company',
      cell: (comm) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink-900">{comm.contactName}</span>
          {comm.companyName && <span className="text-xs text-ink-500">{comm.companyName}</span>}
        </div>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      cell: (comm) => (
        <div className="flex flex-col text-xs text-ink-600">
          <span>{formatDate(comm.date)}</span>
          <span className="text-ink-400">{comm.userName}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (comm) => (
        <Tag tone={STATUS_TONES[comm.status] ?? 'neutral'}>
          {comm.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (comm) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<IconTrash size={14} />}
          onClick={() => setDeleteTarget(comm)}
          aria-label={`Delete ${comm.subject}`}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Communication Log"
        meta={`${pluralize(total, 'log')} logged`}
        actions={
          <Button
            variant="primary"
            icon={<IconPlus size={16} />}
            onClick={() => {
              resetForm();
              setDrawerOpen(true);
            }}
          >
            Log communication
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search communications, subjects, contacts…"
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
              <>
                <FilterSelect
                  label="Channel"
                  allLabel="All channels"
                  value={(filters.type as string) ?? ''}
                  onChange={(val) => setFilter('type', val)}
                  options={[
                    { value: 'email', label: 'Email' },
                    { value: 'call', label: 'Call' },
                    { value: 'meeting', label: 'Meeting' },
                    { value: 'note', label: 'Internal Note' },
                    { value: 'sms', label: 'SMS' },
                  ]}
                />
                <FilterSelect
                  label="Direction"
                  allLabel="All directions"
                  value={(filters.direction as string) ?? ''}
                  onChange={(val) => setFilter('direction', val)}
                  options={[
                    { value: 'inbound', label: 'Inbound' },
                    { value: 'outbound', label: 'Outbound' },
                    { value: 'internal', label: 'Internal' },
                  ]}
                />
              </>
            }
          />
        }
      />

      <Card>
        {communications.length === 0 ? (
          <EmptyState
            icon={<IconMessage size={32} />}
            title="No communication logs found"
            description="Log inbound emails, client calls, or meeting notes to track omnichannel interaction history."
            action={
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setDrawerOpen(true);
                }}
              >
                Log first communication
              </Button>
            }
          />
        ) : (
          <>
            <Table columns={columns} data={communications} keyField="id" />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Log Communication Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Log Communication"
        description="Record an email, call, meeting, or internal note linked to a lead or customer."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="comm-form">
              Save record
            </Button>
          </>
        }
      >
        <form id="comm-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={type}
                  onChange={(e) => setType(e.target.value as CommunicationLog['type'])}
                  options={[
                    { value: 'email', label: 'Email' },
                    { value: 'call', label: 'Phone Call' },
                    { value: 'meeting', label: 'Meeting' },
                    { value: 'note', label: 'Internal Note' },
                    { value: 'sms', label: 'SMS' },
                  ]}
                />
              )}
            </Field>

            <Field label="Direction" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as CommunicationLog['direction'])}
                  options={[
                    { value: 'outbound', label: 'Outbound' },
                    { value: 'inbound', label: 'Inbound' },
                    { value: 'internal', label: 'Internal' },
                  ]}
                />
              )}
            </Field>
          </div>

          <Field label="Contact Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Elena Rostova"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name">
              {({ id }) => (
                <Input
                  id={id}
                  placeholder="e.g. Vertex Global"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              )}
            </Field>

            <Field label="Contact Email">
              {({ id }) => (
                <Input
                  id={id}
                  type="email"
                  placeholder="elena@vertex.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Subject" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="Brief title of discussion or thread"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Summary / Discussion Notes">
            {({ id }) => (
              <Textarea
                id={id}
                rows={4}
                placeholder="Key takeaways, action items, next steps..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            )}
          </Field>

          <Field label="Status">
            {({ id }) => (
              <Select
                id={id}
                value={status}
                onChange={(e) => setStatus(e.target.value as CommunicationLog['status'])}
                options={[
                  { value: 'completed', label: 'Completed' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'missed', label: 'Missed' },
                  { value: 'draft', label: 'Draft' },
                ]}
              />
            )}
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Communication Log?"
        description={`Are you sure you want to delete the record for "${deleteTarget?.subject}"? This cannot be undone.`}
        confirmLabel="Delete record"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
