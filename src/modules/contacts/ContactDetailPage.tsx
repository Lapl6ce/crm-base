import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DescriptionItem, DescriptionList } from '@/components/DescriptionList';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { HeatLabel, HeatStripe } from '@/components/HeatStripe';
import { IconChevronLeft, IconPlus, IconTrash } from '@/components/icons';
import { NotesPanel } from '@/components/NotesPanel';
import { RecordRow } from '@/components/RecordRow';
import { Skeleton } from '@/components/Skeleton';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, formatDateTime, formatRelative, fullName } from '@/lib/format';
import { contactHeat, dealHeat, taskHeat } from '@/lib/heat';
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
  const { user, stages } = useSession();
  const { detail, loading, error, refresh } = useContactDetail(id);
  const { remove } = useContactMutations();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { contact, company, owner, deals, tasks, lastActivityAt } = detail;

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
  const canEditDeals = can(user, 'deals.edit');
  const canEditTasks = can(user, 'tasks.edit');

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

          <Card>
            <CardHeader
              title={`Deals (${deals.length})`}
              action={
                canEditDeals && (
                  <Button
                    size="sm"
                    icon={<IconPlus size={14} />}
                    /* Hand-off by URL again: Deals owns its form, this module
                       only says who the deal is for. */
                    onClick={() =>
                      navigate(
                        `/deals?new=1&contactId=${contact.id}` +
                          (contact.companyId ? `&companyId=${contact.companyId}` : ''),
                      )
                    }
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
                  title="No deals with this person"
                  description="When you start something with them, it will be listed here."
                  action={
                    canEditDeals && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          navigate(
                            `/deals?new=1&contactId=${contact.id}` +
                              (contact.companyId ? `&companyId=${contact.companyId}` : ''),
                          )
                        }
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

          <Card>
            <CardHeader
              title={`Open tasks (${tasks.length})`}
              action={
                canEditTasks && (
                  <Button
                    size="sm"
                    icon={<IconPlus size={14} />}
                    onClick={() => navigate(`/tasks?new=1&contactId=${contact.id}`)}
                  >
                    Add
                  </Button>
                )
              }
            />
            {tasks.length === 0 ? (
              <CardBody>
                <EmptyState
                  size="sm"
                  title="Nothing outstanding"
                  description="No open tasks for this person."
                  action={
                    canEditTasks && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/tasks?new=1&contactId=${contact.id}`)}
                      >
                        Add a task
                      </Button>
                    )
                  }
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {tasks.map((task) => (
                  <li key={task.id}>
                    {/* No `to`: a task has no page of its own. */}
                    <RecordRow
                      heat={taskHeat(task)}
                      title={task.title}
                      subtitle={task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}
                      trailingHint={<HeatLabel heat={taskHeat(task)} />}
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
          <NotesPanel entityType="contact" entityId={contact.id} canWrite={canEdit} />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Timeline" />
          {/* Merged by the repository: this person's own events plus everything
              that happened on their deals and tasks (CONTEXT.md §1). */}
          <ActivityTimeline entityType="contact" entityId={contact.id} className="py-2" />
        </Card>
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
