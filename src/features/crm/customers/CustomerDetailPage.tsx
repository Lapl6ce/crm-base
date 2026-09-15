import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DescriptionItem, DescriptionList } from '@/components/DescriptionList';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { HeatLabel, HeatStripe } from '@/components/HeatStripe';
import { IconChevronLeft, IconTrash } from '@/components/icons';
import { NotesPanel } from '@/components/NotesPanel';
import { RecordRow } from '@/components/RecordRow';
import { Skeleton } from '@/components/Skeleton';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { useContactDetail, useContactMutations } from '@/data/useContacts';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatDate, formatDateTime, formatRelative, fullName } from '@/lib/format';
import { contactHeat, dealHeat, taskHeat } from '@/lib/heat';
import { can } from '@/lib/rbac';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CustomerForm } from './CustomerForm';
import { CUSTOMER_STATUS_LABEL, CUSTOMER_STATUS_TONE } from './customerMeta';

export function CustomerDetailPage() {
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
          title="Customer not found"
          description="The customer record was deleted or the link is incorrect."
          action={<Button onClick={() => navigate('/crm/customers')}>Back to Customers</Button>}
        />
      </Card>
    );
  }

  const name = fullName(contact) || 'Unnamed contact';
  const heat = contactHeat({ lastActivityAt });

  const onDelete = async () => {
    try {
      await remove.run(contact.id);
      toast.success('Customer deleted');
      navigate('/crm/customers', { replace: true });
    } catch {
      // Handled by mutation hook
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/crm/customers"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <IconChevronLeft size={16} /> All Customers
      </Link>

      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-ink-900">{name}</h1>
                <Tag tone={CUSTOMER_STATUS_TONE[contact.status]}>
                  {CUSTOMER_STATUS_LABEL[contact.status]}
                </Tag>
              </div>
              <p className="text-sm text-ink-500">
                {[contact.jobTitle, company?.name].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {can(user, 'contacts.delete') && (
              <Button
                variant="ghost"
                onClick={() => setConfirmOpen(true)}
                className="text-danger-600 hover:bg-danger-100"
                title="Delete customer"
              >
                <IconTrash size={16} />
              </Button>
            )}
            {can(user, 'contacts.edit') && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit Customer
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left Column: Details + Deals + Tasks */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card className="relative overflow-hidden">
            <HeatStripe heat={heat} />
            <CardHeader
              title="Customer Profile"
              action={<HeatLabel heat={heat} />}
            />
            <CardBody>
              <DescriptionList>
                <DescriptionItem label="Work Email">
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="text-accent-600 hover:underline">
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-ink-300">Not recorded</span>
                  )}
                </DescriptionItem>

                <DescriptionItem label="Phone Number">
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="text-accent-600 hover:underline">
                      {contact.phone}
                    </a>
                  ) : (
                    <span className="text-ink-300">Not recorded</span>
                  )}
                </DescriptionItem>

                <DescriptionItem label="Company Account">
                  {company ? (
                    <span className="font-semibold text-ink-900">{company.name}</span>
                  ) : (
                    <span className="text-ink-300">Individual Account</span>
                  )}
                </DescriptionItem>

                <DescriptionItem label="Assigned Account Lead">
                  {owner?.name ?? <span className="text-ink-300">Unassigned</span>}
                </DescriptionItem>

                <DescriptionItem label="Last Engagement Touch">
                  {lastActivityAt ? (
                    <span title={formatDateTime(lastActivityAt)}>{formatRelative(lastActivityAt)}</span>
                  ) : (
                    <span className="text-ink-300">Never</span>
                  )}
                </DescriptionItem>

                <DescriptionItem label="Segmentation Tags">
                  {contact.tags.length === 0 ? (
                    <span className="text-ink-300">No tags</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  )}
                </DescriptionItem>
              </DescriptionList>
            </CardBody>
          </Card>

          {/* Related Deals */}
          <Card className="overflow-hidden">
            <CardHeader
              title={`Related Deals (${deals.length})`}
              action={
                <Link
                  to="/crm/pipeline-deals"
                  className="text-xs font-medium text-ink-500 hover:text-ink-900"
                >
                  Pipeline Board →
                </Link>
              }
            />
            {deals.length === 0 ? (
              <CardBody>
                <EmptyState
                  size="sm"
                  title="No deals linked"
                  description="There are currently no open or closed deals for this customer."
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {deals.map((deal) => {
                  const dealH = dealHeat(deal);
                  return (
                    <li key={deal.id}>
                      <RecordRow
                        to={`/crm/pipeline-deals/${deal.id}`}
                        heat={dealH}
                        title={deal.title}
                        subtitle={stages.find((s) => s.id === deal.stageId)?.name}
                        trailing={formatCurrency(deal.value, deal.currency)}
                        trailingHint={<HeatLabel heat={dealH} />}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Outstanding Tasks */}
          <Card className="overflow-hidden">
            <CardHeader title={`Outstanding Tasks (${tasks.length})`} />
            {tasks.length === 0 ? (
              <CardBody>
                <EmptyState
                  size="sm"
                  title="All tasks completed"
                  description="No pending action items for this account."
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {tasks.map((task) => {
                  const tHeat = taskHeat(task);
                  return (
                    <li key={task.id}>
                      <RecordRow
                        heat={tHeat}
                        title={task.title}
                        subtitle={task.dueDate ? `Due ${formatDate(task.dueDate)}` : undefined}
                        trailingHint={<HeatLabel heat={tHeat} />}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Right Column: Communication Notes & Timeline */}
        <div className="flex flex-col gap-5 lg:col-span-1">
          <Card className="overflow-hidden">
            <CardHeader title="Account Notes" />
            <NotesPanel entityType="contact" entityId={contact.id} />
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Activity Stream" />
            <ActivityTimeline entityType="contact" entityId={contact.id} limit={15} />
          </Card>
        </div>
      </div>

      <CustomerForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        contact={contact}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Customer"
        description={`Permanently remove ${name}? Deals and tasks associated with this contact will have their links detached.`}
        confirmLabel="Delete Customer"
        tone="danger"
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-16 w-full rounded-card" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  );
}
