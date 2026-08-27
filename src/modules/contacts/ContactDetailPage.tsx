import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DescriptionItem, DescriptionList } from '@/components/DescriptionList';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { HeatStripe } from '@/components/HeatStripe';
import { IconChevronLeft, IconTrash } from '@/components/icons';
import { Skeleton } from '@/components/Skeleton';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatDate, formatDateTime, formatRelative, fullName } from '@/lib/format';
import { contactHeat } from '@/lib/heat';
import { can } from '@/lib/rbac';
import { CONTACT_STATUS_LABEL, CONTACT_STATUS_TONE } from './contactMeta';
import { ContactForm } from './ContactForm';
import { useContactDetail, useContactMutations } from './useContacts';

/* One person, everything known about them.
 *
 * A route rather than a drawer, because a contact is something you link to:
 * from a company, from the command bar, from a colleague's message. Editing is
 * still a drawer over the top — you keep the record you are changing in view.
 */

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const { detail, loading, error, refresh } = useContactDetail(id);
  const { remove } = useContactMutations();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { contact, company, owner, lastActivityAt } = detail;

  if (loading) return <DetailSkeleton />;
  if (error) return <ErrorState description={error.message} onRetry={refresh} />;

  if (!contact) {
    return (
      <Card>
        <EmptyState
          title="That contact is gone"
          description="It was deleted, or the link is wrong. The contact list will have who you are looking for."
          action={<Button onClick={() => navigate('/contacts')}>Back to contacts</Button>}
        />
      </Card>
    );
  }

  const name = fullName(contact) || 'Unnamed contact';
  const heat = contactHeat({ lastActivityAt });
  const canEdit = can(user, 'contacts.edit');
  const canDelete = can(user, 'contacts.delete');

  const onDelete = async () => {
    try {
      await remove.run(contact.id);
      toast.success(`${name} deleted`);
      navigate('/contacts');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete that contact');
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/contacts"
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-900"
      >
        <IconChevronLeft size={14} />
        All contacts
      </Link>

      <PageHeader
        title={name}
        description={contact.jobTitle ?? undefined}
        actions={
          <>
            {canEdit && (
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

      {/* Identity strip: the heat stripe, then the same reading in words. */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <div className="flex min-h-11 items-stretch gap-3">
            <HeatStripe heat={heat} />
            <Avatar name={name} color={owner?.avatarColor} size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={CONTACT_STATUS_TONE[contact.status]}>
                {CONTACT_STATUS_LABEL[contact.status]}
              </Tag>
              {company && (
                <Link
                  to={`/companies/${company.id}`}
                  className="text-base font-medium text-ink-700 underline-offset-2 hover:text-accent-600 hover:underline"
                >
                  {company.name}
                </Link>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-500">
              {lastActivityAt
                ? `Last activity ${formatRelative(lastActivityAt)} · ${heat.label}`
                : 'No activity recorded yet'}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Details" />
          <CardBody>
            <DescriptionList>
              <DescriptionItem label="Email" empty="No email">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="underline-offset-2 hover:text-accent-600 hover:underline"
                  >
                    {contact.email}
                  </a>
                )}
              </DescriptionItem>
              <DescriptionItem label="Phone" empty="No phone">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="underline-offset-2 hover:text-accent-600 hover:underline"
                  >
                    {contact.phone}
                  </a>
                )}
              </DescriptionItem>
              <DescriptionItem label="Job title" empty="Not set">
                {contact.jobTitle}
              </DescriptionItem>
              <DescriptionItem label="Company" empty="Not linked">
                {company && (
                  <Link
                    to={`/companies/${company.id}`}
                    className="underline-offset-2 hover:text-accent-600 hover:underline"
                  >
                    {company.name}
                  </Link>
                )}
              </DescriptionItem>
              <DescriptionItem label="Owner" empty="Unassigned">
                {owner && (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={owner.name} color={owner.avatarColor} size="sm" />
                    {owner.name}
                  </span>
                )}
              </DescriptionItem>
              <DescriptionItem label="Added">{formatDate(contact.createdAt)}</DescriptionItem>
              <DescriptionItem label="Tags" wide empty="No tags">
                {contact.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
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
            <CardHeader title="Record" />
            <CardBody>
              <DescriptionList columns={1}>
                <DescriptionItem label="Last updated">
                  {formatDateTime(contact.updatedAt)}
                </DescriptionItem>
                <DescriptionItem label="Created">
                  {formatDateTime(contact.createdAt)}
                </DescriptionItem>
              </DescriptionList>
            </CardBody>
          </Card>

          {/* Deals, tasks and the merged timeline are Phases 3 and 4. The slot
              is here now so the page does not get re-laid-out when they land. */}
          <Card>
            <CardHeader title="Deals, tasks & timeline" />
            <CardBody>
              <EmptyState
                size="sm"
                title="Arriving in Phases 3 and 4"
                description="This contact's deals, open tasks and merged activity feed appear here. The data layer already records the events they will read."
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <ContactForm open={editOpen} onClose={() => setEditOpen(false)} contact={contact} />

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${name}?`}
        description="Their deals and tasks are kept — they simply lose the link to this person. Notes written on this contact are removed with it. This cannot be undone."
        confirmLabel="Delete contact"
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
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full rounded-card" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-card lg:col-span-2" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    </div>
  );
}
