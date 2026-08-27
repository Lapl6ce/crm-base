import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DescriptionItem, DescriptionList } from '@/components/DescriptionList';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { IconChevronLeft, IconChevronRight, IconPlus, IconTrash } from '@/components/icons';
import { Skeleton } from '@/components/Skeleton';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatDate, formatDateTime, fullName, pluralize } from '@/lib/format';
import { can } from '@/lib/rbac';
import { COMPANY_SIZE_LABEL, formatAddress, websiteUrl } from './companyMeta';
import { CompanyForm } from './CompanyForm';
import { useCompanyDetail, useCompanyMutations } from './useCompanies';

/* One account: its details, and the people at it.
 *
 * The contact rows here are rendered locally rather than by reusing anything
 * from modules/contacts — that import is exactly what module isolation forbids
 * (CONTEXT.md §3). The data comes from provider.contacts, and "Add contact"
 * hands off through the URL, which is a contract neither module owns.
 */

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const { detail, loading, error, refresh } = useCompanyDetail(id);
  const { remove } = useCompanyMutations();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { company, contacts, owner } = detail;

  if (loading) return <DetailSkeleton />;
  if (error) return <ErrorState description={error.message} onRetry={refresh} />;

  if (!company) {
    return (
      <Card>
        <EmptyState
          title="That company is gone"
          description="It was deleted, or the link is wrong. The company list will have the account you want."
          action={<Button onClick={() => navigate('/companies')}>Back to companies</Button>}
        />
      </Card>
    );
  }

  const canEditCompanies = can(user, 'companies.edit');
  const canDelete = can(user, 'companies.delete');
  const canEditContacts = can(user, 'contacts.edit');
  const site = websiteUrl(company);
  const address = formatAddress(company.address);

  const onDelete = async () => {
    try {
      await remove.run(company.id);
      toast.success(`${company.name} deleted`);
      navigate('/companies');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete that company');
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/companies"
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-900"
      >
        <IconChevronLeft size={14} />
        All companies
      </Link>

      <PageHeader
        title={company.name}
        meta={company.industry ?? undefined}
        description={site ?? undefined}
        actions={
          <>
            {canEditCompanies && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                icon={<IconTrash size={16} />}
                onClick={() => setConfirmOpen(true)}
                className="text-danger-600 hover:bg-danger-100 hover:text-danger-600"
              >
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Details" />
          <CardBody>
            <DescriptionList>
              <DescriptionItem label="Website" empty="Not set">
                {site && (
                  <a
                    href={site}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline-offset-2 hover:text-accent-600 hover:underline"
                  >
                    {company.website || company.domain}
                  </a>
                )}
              </DescriptionItem>
              <DescriptionItem label="Phone" empty="No phone">
                {company.phone && (
                  <a
                    href={`tel:${company.phone}`}
                    className="underline-offset-2 hover:text-accent-600 hover:underline"
                  >
                    {company.phone}
                  </a>
                )}
              </DescriptionItem>
              <DescriptionItem label="Industry" empty="Not set">
                {company.industry}
              </DescriptionItem>
              <DescriptionItem label="Size" empty="Unknown">
                {company.size && COMPANY_SIZE_LABEL[company.size]}
              </DescriptionItem>
              <DescriptionItem label="Owner" empty="Unassigned">
                {owner && (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={owner.name} color={owner.avatarColor} size="sm" />
                    {owner.name}
                  </span>
                )}
              </DescriptionItem>
              <DescriptionItem label="Added">{formatDate(company.createdAt)}</DescriptionItem>
              <DescriptionItem label="Address" wide empty="No address">
                {address}
              </DescriptionItem>
              <DescriptionItem label="Tags" wide empty="No tags">
                {company.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {company.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </span>
                )}
              </DescriptionItem>
            </DescriptionList>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title={`People (${contacts.length})`}
              action={
                canEditContacts && (
                  <Button
                    size="sm"
                    icon={<IconPlus size={14} />}
                    /* Hand-off by URL: Contacts owns its own form, this module
                       only says who the contact belongs to. */
                    onClick={() => navigate(`/contacts?new=1&companyId=${company.id}`)}
                  >
                    Add
                  </Button>
                )
              }
            />
            {contacts.length === 0 ? (
              <CardBody>
                <EmptyState
                  size="sm"
                  title="Nobody here yet"
                  description="Add the people you deal with at this account and they will be listed here."
                  action={
                    canEditContacts && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/contacts?new=1&companyId=${company.id}`)}
                      >
                        Add a contact
                      </Button>
                    )
                  }
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    <Link
                      to={`/contacts/${contact.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-app"
                    >
                      <Avatar name={fullName(contact) || 'Unnamed'} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium text-ink-900">
                          {fullName(contact) || 'Unnamed'}
                        </span>
                        {contact.jobTitle && (
                          <span className="block truncate text-xs text-ink-300">
                            {contact.jobTitle}
                          </span>
                        )}
                      </span>
                      <IconChevronRight size={16} className="shrink-0 text-ink-150" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Record" />
            <CardBody>
              <DescriptionList columns={1}>
                <DescriptionItem label="Last updated">
                  {formatDateTime(company.updatedAt)}
                </DescriptionItem>
                <DescriptionItem label="Created">
                  {formatDateTime(company.createdAt)}
                </DescriptionItem>
              </DescriptionList>
            </CardBody>
          </Card>

          {/* Deals and the activity feed for this account arrive with their
              own phases; the slot is reserved so nothing shifts later. */}
          <Card>
            <CardHeader title="Deals & timeline" />
            <CardBody>
              <EmptyState
                size="sm"
                title="Arriving in Phases 3 and 4"
                description="Open deals with this account and its activity feed appear here."
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <CompanyForm open={editOpen} onClose={() => setEditOpen(false)} company={company} />

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${company.name}?`}
        description={
          contacts.length > 0
            ? `${pluralize(contacts.length, 'contact')} and any deals at this account are kept — they lose the link to the company, nothing more. Notes written on the company itself are removed. This cannot be undone.`
            : 'Any deals at this account are kept — they lose the link to the company, nothing more. Notes written on the company itself are removed. This cannot be undone.'
        }
        confirmLabel="Delete company"
        pending={remove.pending}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-card lg:col-span-2" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );
}
