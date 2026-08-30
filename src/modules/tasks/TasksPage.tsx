import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Checkbox } from '@/components/Field';
import { HeatLabel } from '@/components/HeatStripe';
import { IconPlus } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { useListQuery } from '@/data/useListQuery';
import { useSession } from '@/data/useSession';
import type { ID, Task } from '@/data/types';
import { PageHeader } from '@/layout/PageHeader';
import { cn } from '@/lib/cn';
import { formatDate, fullName, pluralize } from '@/lib/format';
import { taskHeat } from '@/lib/heat';
import { can } from '@/lib/rbac';
import { TaskForm } from './TaskForm';
import {
  PRIORITY_LABEL,
  PRIORITY_OPTIONS,
  PRIORITY_TONE,
  TASK_DEFAULT_SORT,
  TASK_SCOPES,
  scopeFilter,
  type TaskScope,
} from './taskMeta';
import { useTaskList, useTaskLookups, useTaskMutations } from './useTasks';

/* The task list — the one screen in the app that is a to-do list rather than a
 * record browser, so it opens on what is still open, sorted by when it is due.
 *
 * The checkbox is the only control that completes a task, and it calls
 * setCompleted() rather than patching the field, so ticking one always writes
 * the history that the timeline reads.
 */

export function TasksPage() {
  const { user, users } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const [scope, setScope] = useState<TaskScope>('open');
  const list = useListQuery({ defaultSort: TASK_DEFAULT_SORT });
  const { lookups } = useTaskLookups();
  const { setCompleted } = useTaskMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{ contactId?: ID; dealId?: ID }>({});

  /* The scope tabs are a filter on `completed`, merged into the same
     ListQuery everything else uses — not a second, parallel filtering path. */
  const query = useMemo(
    () => ({ ...list.query, filters: { ...list.query.filters, ...scopeFilter(scope) } }),
    [list.query, scope],
  );
  const { data, loading, error, refresh } = useTaskList(query);

  /* URL hand-off, same contract as Contacts and Deals. */
  useEffect(() => {
    if (searchParams.get('new') === null) return;
    setCreateDefaults({
      contactId: searchParams.get('contactId') ?? undefined,
      dealId: searchParams.get('dealId') ?? undefined,
    });
    setEditing(null);
    setFormOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setCreateDefaults({});
    setFormOpen(true);
  }, []);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const canEdit = can(user, 'tasks.edit');
  const narrowed = Boolean(list.query.search) || list.activeFilterCount > 0;

  const onToggle = async (task: Task) => {
    try {
      await setCompleted.run(task.id, !task.completed, user?.id ?? task.ownerId);
      if (!task.completed) toast.success(`“${task.title}” done`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update that task');
    }
  };

  const columns: Column<Task>[] = [
    {
      key: 'done',
      header: 'Done',
      width: '3.5rem',
      render: (task) => (
        <Checkbox
          checked={task.completed}
          disabled={!canEdit}
          onChange={() => onToggle(task)}
          onClick={(event) => event.stopPropagation()}
          aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
        />
      ),
    },
    {
      key: 'title',
      header: 'Task',
      sortField: 'title',
      mobile: 'primary',
      render: (task) => (
        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-medium text-ink-900',
              // Struck through as well as greyed: two signals, so completion
              // does not rest on colour alone.
              task.completed && 'text-ink-300 line-through',
            )}
          >
            {task.title}
          </p>
          {task.description && <p className="truncate text-xs text-ink-300">{task.description}</p>}
        </div>
      ),
    },
    {
      key: 'context',
      header: 'About',
      mobile: 'secondary',
      render: (task) => {
        const contact = task.contactId ? lookups.contactById.get(task.contactId) : undefined;
        const deal = task.dealId ? lookups.dealById.get(task.dealId) : undefined;
        if (!contact && !deal) return <span className="text-ink-300">—</span>;
        return (
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs">
            {deal && (
              <Link
                to={`/deals/${deal.id}`}
                onClick={(event) => event.stopPropagation()}
                className="truncate text-ink-700 underline-offset-2 hover:text-accent-600 hover:underline"
              >
                {deal.title}
              </Link>
            )}
            {deal && contact && <span className="text-ink-150">·</span>}
            {contact && (
              <Link
                to={`/contacts/${contact.id}`}
                onClick={(event) => event.stopPropagation()}
                className="truncate text-ink-500 underline-offset-2 hover:text-accent-600 hover:underline"
              >
                {fullName(contact) || 'Unnamed'}
              </Link>
            )}
          </span>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      sortField: 'priority',
      width: '7rem',
      render: (task) =>
        task.priority === 'medium' ? (
          <span className="text-xs text-ink-300">{PRIORITY_LABEL[task.priority]}</span>
        ) : (
          <Tag tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Tag>
        ),
    },
    {
      key: 'due',
      header: 'Due',
      sortField: 'dueDate',
      align: 'right',
      width: '10rem',
      render: (task) => (
        <div className="flex flex-col items-end">
          <span className="tnum text-xs text-ink-500">
            {task.dueDate ? formatDate(task.dueDate) : '—'}
          </span>
          <HeatLabel heat={taskHeat(task)} />
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      mobile: 'desktop',
      width: '3.5rem',
      align: 'right',
      render: (task) => {
        const owner = userById.get(task.ownerId);
        return owner ? (
          <Avatar name={owner.name} color={owner.avatarColor} size="sm" />
        ) : (
          <span className="text-ink-300">—</span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tasks"
        meta={loading ? undefined : pluralize(total, 'task')}
        actions={
          canEdit && (
            <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
              New task
            </Button>
          )
        }
        toolbar={
          <div className="flex flex-col gap-3">
            {/* Open / Done / All. Tabs rather than another select: it is the
                first thing anyone changes on this screen. */}
            <div
              role="tablist"
              aria-label="Which tasks to show"
              className="flex w-fit gap-0.5 rounded bg-surface-sunken p-0.5"
            >
              {TASK_SCOPES.map((option) => (
                <button
                  key={option.value}
                  role="tab"
                  type="button"
                  aria-selected={scope === option.value}
                  onClick={() => {
                    setScope(option.value);
                    list.setPage(1);
                  }}
                  className={cn(
                    'rounded px-3 py-1 text-xs font-medium',
                    'motion-safe:transition-colors',
                    scope === option.value
                      ? 'bg-surface-card text-ink-900 shadow-sm'
                      : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <ListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search tasks…"
              activeFilterCount={list.activeFilterCount}
              onClearFilters={list.clearFilters}
              filters={
                <>
                  <FilterSelect
                    label="Filter by priority"
                    allLabel="Any priority"
                    value={list.filters.priority ?? ''}
                    onChange={(value) => list.setFilter('priority', value)}
                    options={PRIORITY_OPTIONS}
                  />
                  <FilterSelect
                    label="Filter by owner"
                    allLabel="Any owner"
                    value={list.filters.ownerId ?? ''}
                    onChange={(value) => list.setFilter('ownerId', value)}
                    options={users.map((u) => ({ value: u.id, label: u.name }))}
                  />
                </>
              }
            />
          </div>
        }
      />

      <Card className="overflow-hidden">
        {error ? (
          <ErrorState description={error.message} onRetry={refresh} />
        ) : (
          <>
            <Table
              items={items}
              columns={columns}
              rowKey={(task) => task.id}
              sort={list.sort}
              onSortChange={list.setSort}
              onRowClick={
                canEdit
                  ? (task) => {
                      setEditing(task);
                      setFormOpen(true);
                    }
                  : undefined
              }
              heat={(task) => taskHeat(task)}
              loading={loading}
              empty={
                narrowed ? (
                  <EmptyState
                    title="No tasks match"
                    description="Nothing here fits that search and those filters. Widen one of them to see tasks again."
                    action={
                      <Button
                        onClick={() => {
                          list.setSearch('');
                          list.clearFilters();
                        }}
                      >
                        Reset search and filters
                      </Button>
                    }
                  />
                ) : scope === 'open' ? (
                  <EmptyState
                    title="Nothing left to do"
                    description="No open tasks. Either you are on top of everything, or the next one has not been written down yet."
                    action={
                      canEdit && (
                        <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
                          New task
                        </Button>
                      )
                    }
                    secondaryAction={
                      <Button variant="ghost" onClick={() => setScope('done')}>
                        See completed
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    title={scope === 'done' ? 'Nothing completed yet' : 'No tasks yet'}
                    description={
                      scope === 'done'
                        ? 'Tasks you tick off will be listed here.'
                        : 'Tasks are the things you owe someone. Write the first one down.'
                    }
                    action={
                      canEdit && (
                        <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
                          New task
                        </Button>
                      )
                    }
                  />
                )
              }
            />
            {items.length > 0 && (
              <Pagination
                page={data?.page ?? 1}
                pageSize={data?.pageSize ?? list.pageSize}
                total={total}
                onPageChange={list.setPage}
                className="border-t border-ink-100 px-3"
              />
            )}
          </>
        )}
      </Card>

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={editing}
        defaults={createDefaults}
      />
    </div>
  );
}
