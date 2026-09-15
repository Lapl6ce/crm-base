import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DescriptionItem, DescriptionList } from '@/components/DescriptionList';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Select } from '@/components/Field';
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
import { dealHeat, taskHeat } from '@/lib/heat';
import { can } from '@/lib/rbac';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DealForm } from './DealForm';
import { DEAL_STATUS_LABEL, DEAL_STATUS_TONE, STAGE_OUTCOME_LABEL } from './dealMeta';
import { useDealDetail, useDealMutations } from './useDeals';

/* One deal.
 *
 * The stage control here is the same operation as dragging a card: it calls
 * moveToStage(), so the stamp, the derived status and the activity event are
 * identical whichever way the deal was moved.
 */

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, stages } = useSession();
  const { detail, loading, error, refresh } = useDealDetail(id);
  const { remove, move } = useDealMutations();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { deal, contact, company, owner, stage, tasks } = detail;

  if (loading) return <DetailSkeleton />;
  if (error) return <ErrorState description={error.message} onRetry={refresh} />;

  if (!deal) {
    return (
      <Card>
        <EmptyState
          title="That deal is gone"
          description="It was deleted, or the link is wrong. The pipeline will have what you are looking for."
          action={<Button onClick={() => navigate('/crm/pipeline-deals')}>Back to the pipeline</Button>}
        />
      </Card>
    );
  }

  const heat = dealHeat(deal);
  const canEdit = can(user, 'deals.edit');
  const canDelete = can(user, 'deals.delete');
  const canEditTasks = can(user, 'tasks.edit');

  const onMove = async (stageId: string) => {
    if (!stageId || stageId === deal.stageId) return;
    try {
      await move.run(deal.id, stageId, user?.id ?? deal.ownerId);
      toast.success(`Moved to ${stages.find((s) => s.id === stageId)?.name ?? 'a new stage'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That move did not stick');
    }
  };

  const onDelete = async () => {
    try {
      await remove.run(deal.id);
      toast.success(`${deal.title} deleted`);
      navigate('/crm/pipeline-deals');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete that deal');
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/crm/pipeline-deals"
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-900"
      >
        <IconChevronLeft size={14} />
        Pipeline
      </Link>

      <PageHeader
        title={deal.title}
        meta={formatCurrency(deal.value, deal.currency)}
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

      <Card>
        <CardBody className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex min-h-11 items-stretch gap-3">
            <HeatStripe heat={heat} />
            <div>
              <p className="tnum font-mono text-lg font-semibold text-ink-900">
                {formatCurrency(deal.value, deal.currency)}
              </p>
              <HeatLabel heat={heat} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={DEAL_STATUS_TONE[deal.status]}>{DEAL_STATUS_LABEL[deal.status]}</Tag>
            <span className="text-xs text-ink-300">
              in {stage?.name ?? 'an unknown stage'} since {formatRelative(deal.stageEnteredAt)}
            </span>
          </div>

          {canEdit && stages.length > 0 && (
            <label className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-ink-500">Stage</span>
              <Select
                value={deal.stageId}
                onChange={(event) => onMove(event.target.value)}
                disabled={move.pending}
                className="min-w-[11rem]"
                options={stages.map((s) => ({
                  value: s.id,
                  label:
                    s.outcome === 'open'
                      ? s.name
                      : `${s.name} (${STAGE_OUTCOME_LABEL[s.outcome].toLowerCase()})`,
                }))}
              />
            </label>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Details" />
          <CardBody>
            <DescriptionList>
              <DescriptionItem label="Company" empty="Not linked">
                {company && (
                  <Link
                    to={`/crm/customers/${company.id}`}
                    className="underline-offset-2 hover:text-accent-600 hover:underline"
                  >
                    {company.name}
                  </Link>
                )}
              </DescriptionItem>
              <DescriptionItem label="Contact" empty="Not linked">
                {contact && (
                  <Link
                    to={`/crm/customers/${contact.id}`}
                    className="underline-offset-2 hover:text-accent-600 hover:underline"
                  >
                    {fullName(contact) || 'Unnamed'}
                  </Link>
                )}
              </DescriptionItem>
              <DescriptionItem label="Expected close" empty="No close date">
                {deal.expectedCloseDate && formatDate(deal.expectedCloseDate)}
              </DescriptionItem>
              <DescriptionItem label="Owner" empty="Unassigned">
                {owner && (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={owner.name} color={owner.avatarColor} size="sm" />
                    {owner.name}
                  </span>
                )}
              </DescriptionItem>
              <DescriptionItem label="Stage">
                {stage ? `${stage.name} · ${STAGE_OUTCOME_LABEL[stage.outcome].toLowerCase()}` : '—'}
              </DescriptionItem>
              <DescriptionItem label="In this stage since">
                {formatDate(deal.stageEnteredAt)}
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
                  {formatDateTime(deal.updatedAt)}
                </DescriptionItem>
                <DescriptionItem label="Created">{formatDateTime(deal.createdAt)}</DescriptionItem>
              </DescriptionList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`Open tasks (${tasks.length})`}
              action={
                canEditTasks && (
                  <Button
                    size="sm"
                    icon={<IconPlus size={14} />}
                    onClick={() => navigate(`/dashboard/action-center`)}
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
                  description="No open tasks on this deal."
                  action={
                    canEditTasks && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/dashboard/action-center`)}
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
          <NotesPanel entityType="deal" entityId={deal.id} canWrite={canEdit} />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Timeline" />
          {/* Every stage change above is already in here — written by the
              repository, not by the board or this page. */}
          <ActivityTimeline entityType="deal" entityId={deal.id} className="py-2" />
        </Card>
      </div>

      <DealForm open={editOpen} onClose={() => setEditOpen(false)} deal={deal} />

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${deal.title}?`}
        description="Tasks on this deal are kept — they lose the link to it. Notes written on the deal are removed. Its history stays in the activity log. This cannot be undone."
        confirmLabel="Delete deal"
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
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-20 w-full rounded-card" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-card lg:col-span-2" />
        <Skeleton className="h-56 rounded-card" />
      </div>
    </div>
  );
}

