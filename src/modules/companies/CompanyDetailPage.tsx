import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DescriptionItem, DescriptionList } from '@/components/DescriptionList';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { HeatLabel } from '@/components/HeatStripe';
import { IconChevronLeft, IconPlus, IconTrash } from '@/components/icons';
import { NotesPanel } from '@/components/NotesPanel';
import { RecordRow } from '@/components/RecordRow';
import { Skeleton } from '@/components/Skeleton';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, formatDateTime, fullName, pluralize } from '@/lib/format';
import { dealHeat } from '@/lib/heat';
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
  const { user, stages } = useSession();
  const { detail, loading, error, refresh } = useCompanyDetail(id);
  const { remove } = useCompanyMutations();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { company, contacts, deals, owner } = detail;

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
  const canEditDeals = can(user, 'deals.edit');
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
                    <RecordRow
                      to={`/contacts/${contact.id}`}
                      leading={<Avatar name={fullName(contact) || 'Unnamed'} size="sm" />}
                      title={fullName(contact) || 'Unnamed'}
                      subtitle={contact.jobTitle}
                    />
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

          <Card>
            <CardHeader
              title={`Deals (${deals.length})`}
              action={
                canEditDeals && (
                  <Button
                    size="sm"
                    icon={<IconPlus size={14} />}
                    onClick={() => navigate(`/deals?new=1&companyId=${company.id}`)}
                  >
                    Add
                  </Button>
                )
              }
            />
            {deals.length === 0 ? (
              <CardBody>
                <EmptyState
                  size="sm"
                  title="No deals with this account"
                  description="Deals you open with this company will be listed here."
                  action={
                    canEditDeals && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/deals?new=1&companyId=${company.id}`)}
                      >
                        New deal
                      </Button>
                    )
                  }
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {deals.map((deal) => (
                  <li key={deal.id}>
                    <RecordRow
                      to={`/deals/${deal.id}`}
                      heat={dealHeat(deal)}
                      title={deal.title}
                      subtitle={stages.find((s) => s.id === deal.stageId)?.name}
                      trailing={formatCurrency(deal.value, deal.currency)}
                      trailingHint={<HeatLabel heat={dealHeat(deal)} />}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>


        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Notes" />
          <NotesPanel entityType="company" entityId={company.id} canWrite={canEditCompanies} />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Timeline" />
          {/* Everything at this account: its own events plus its people's and
              its deals', merged by the repository. */}
          <ActivityTimeline entityType="company" entityId={company.id} className="py-2" />
        </Card>
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
