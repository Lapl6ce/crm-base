import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Pagination } from '@/components/Pagination';
import { Skeleton } from '@/components/Skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { IconCheck, IconPlus, IconTrash } from '@/components/icons';
import type { Contact, ID } from '@/data/types';
import { useContactList, useContactLookups, useContactMutations } from '@/data/useContacts';
import { useListQuery } from '@/data/useListQuery';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatDate } from '@/lib/format';
import { useState } from 'react';

export function LeadsPage() {
  const { user, users } = useSession();
  const { query, setPage, setSearch } = useListQuery({
    filters: { status: 'lead' },
    defaultSort: { field: 'createdAt', dir: 'desc' },
  });

  const { data: page, loading, error, refresh } = useContactList(query);
  const { lookups } = useContactLookups();
  const { create, update, remove } = useContactMutations();

  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Contact | null>(null);
  const [deletingId, setDeletingId] = useState<ID | null>(null);

  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formTags, setFormTags] = useState('Prospect, Inbound');

  const openCreateLead = () => {
    setEditingLead(null);
    setFormFirstName('');
    setFormLastName('');
    setFormEmail('');
    setFormPhone('');
    setFormJobTitle('');
    setFormCompanyId('');
    setFormTags('Prospect, Inbound');
    setLeadDrawerOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim() || !formLastName.trim()) {
      toast.error('First and last name are required');
      return;
    }

    try {
      if (editingLead) {
        await update.run(editingLead.id, {
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          jobTitle: formJobTitle.trim() || undefined,
          companyId: formCompanyId || undefined,
          tags: formTags.split(',').map((t) => t.trim()).filter(Boolean),
        });
        toast.success('Lead updated successfully');
      } else {
        await create.run({
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          jobTitle: formJobTitle.trim() || undefined,
          companyId: formCompanyId || undefined,
          tags: formTags.split(',').map((t) => t.trim()).filter(Boolean),
          status: 'lead',
          ownerId: user?.id ?? 'user_admin',
        });
        toast.success('Lead prospect created');
      }
      setLeadDrawerOpen(false);
      refresh();
    } catch {
      toast.error('Failed to save lead');
    }
  };

  const handleConvertToCustomer = async (lead: Contact) => {
    try {
      await update.run(lead.id, { status: 'active' });
      toast.success(`${lead.firstName} ${lead.lastName} converted to active Customer!`);
      refresh();
    } catch {
      toast.error('Failed to convert lead');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await remove.run(deletingId);
      toast.info('Lead deleted');
      setDeletingId(null);
      refresh();
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Leads"
        description="Pre-sale prospect intake, inbound marketing inquiries, and lead qualification."
        actions={
          <Button variant="primary" onClick={openCreateLead}>
            <IconPlus size={16} /> New Lead
          </Button>
        }
      />

      <Card>
        <ListToolbar
          search={query.search ?? ''}
          onSearchChange={setSearch}
          searchPlaceholder="Search leads by name, email, or company…"
        />

        {loading ? (
          <div className="p-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <ErrorState description={error.message} onRetry={refresh} />
        ) : !page || page.items.length === 0 ? (
          <EmptyState
            title="No leads found"
            description="All prospect inquiries have either been qualified into customers or none exist yet."
            action={
              <Button variant="primary" onClick={openCreateLead}>
                Add Prospect
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Assigned Owner</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((lead) => {
                  const company = lead.companyId ? lookups.companyById.get(lead.companyId) : null;
                  const owner = users.find((u) => u.id === lead.ownerId);

                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={`${lead.firstName} ${lead.lastName}`} size="sm" />
                          <div>
                            <p className="font-semibold text-ink-900">
                              {lead.firstName} {lead.lastName}
                            </p>
                            <p className="text-2xs text-ink-500">{lead.jobTitle ?? 'Prospect'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {company ? (
                          <span className="font-medium text-ink-900">{company.name}</span>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-ink-700">{lead.email ?? '—'}</p>
                        {lead.phone && <p className="text-2xs text-ink-300">{lead.phone}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.map((tag) => (
                            <Tag key={tag} tone="neutral">
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-ink-700">{owner?.name ?? 'Unassigned'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-ink-500">{formatDate(lead.createdAt)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleConvertToCustomer(lead)}
                            title="Convert to Active Customer"
                          >
                            <IconCheck size={14} className="text-positive-600" />
                            Convert
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingLead(lead);
                              setFormFirstName(lead.firstName);
                              setFormLastName(lead.lastName);
                              setFormEmail(lead.email ?? '');
                              setFormPhone(lead.phone ?? '');
                              setFormJobTitle(lead.jobTitle ?? '');
                              setFormCompanyId(lead.companyId ?? '');
                              setFormTags(lead.tags.join(', '));
                              setLeadDrawerOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingId(lead.id)}
                            className="text-danger-600 hover:bg-danger-100"
                          >
                            <IconTrash size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Create / Edit Lead Drawer */}
      <Drawer
        open={leadDrawerOpen}
        onClose={() => setLeadDrawerOpen(false)}
        title={editingLead ? 'Edit Lead' : 'New Lead Intake'}
      >
        <form onSubmit={handleSaveLead} className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required>
              <Input
                value={formFirstName}
                onChange={(e) => setFormFirstName(e.target.value)}
                placeholder="Ada"
                required
              />
            </Field>
            <Field label="Last Name" required>
              <Input
                value={formLastName}
                onChange={(e) => setFormLastName(e.target.value)}
                placeholder="Lovelace"
                required
              />
            </Field>
          </div>

          <Field label="Work Email">
            <Input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="ada@example.com"
            />
          </Field>

          <Field label="Phone Number">
            <Input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="+1 555 0192"
            />
          </Field>

          <Field label="Job Title / Role">
            <Input
              value={formJobTitle}
              onChange={(e) => setFormJobTitle(e.target.value)}
              placeholder="VP of Engineering"
            />
          </Field>

          <Field label="Associated Company">
            <Select value={formCompanyId} onChange={(e) => setFormCompanyId(e.target.value)}>
              <option value="">None / Standalone Prospect</option>
              {lookups.companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tags (comma separated)">
            <Input
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              placeholder="Inbound, Enterprise, Referral"
            />
          </Field>

          <div className="mt-4 flex justify-end gap-2 border-t border-ink-100 pt-4">
            <Button variant="ghost" type="button" onClick={() => setLeadDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingLead ? 'Save Changes' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete Lead Prospect"
        description="Are you sure you want to remove this lead? This action cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
