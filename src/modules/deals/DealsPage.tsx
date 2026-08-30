import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { IconPlus } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Skeleton } from '@/components/Skeleton';
import { useListQuery } from '@/data/useListQuery';
import { useSession } from '@/data/useSession';
import type { Deal, ID } from '@/data/types';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, pluralize } from '@/lib/format';
import { can } from '@/lib/rbac';
import { DealForm } from './DealForm';
import { sumByCurrency } from './dealMeta';
import { PipelineBoard } from './PipelineBoard';
import { useDealBoard } from './useDeals';

/* The pipeline screen: a toolbar, a board, and the deal form.
 *
 * The columns are whatever AppSettings.stages says they are — names, order and
 * which ones close a deal. Nothing here is hardcoded, which is what lets a fork
 * rename the pipeline in Settings without touching this module. */

export function DealsPage() {
  const navigate = useNavigate();
  const { user, users, stages, settings, loading: sessionLoading } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  // The board shows every matching deal at once; there is no paging in a
  // pipeline, so pageSize is 0 ("everything") and only search/filters apply.
  const list = useListQuery({ pageSize: 0, defaultSort: { field: 'updatedAt', dir: 'desc' } });
  const { deals, loading, error, refresh } = useDealBoard(list.query);

  const [formOpen, setFormOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{
    stageId?: ID;
    contactId?: ID;
    companyId?: ID;
  }>({});

  /* Same URL hand-off Contacts uses: a contact or company page can send you
     here to open a prefilled deal form, with no cross-module import. */
  useEffect(() => {
    if (searchParams.get('new') === null) return;
    setCreateDefaults({
      contactId: searchParams.get('contactId') ?? undefined,
      companyId: searchParams.get('companyId') ?? undefined,
    });
    setFormOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const openCreate = useCallback((stageId?: ID) => {
    setCreateDefaults({ stageId });
    setFormOpen(true);
  }, []);

  const canEdit = can(user, 'deals.edit');
  const narrowed = Boolean(list.query.search) || list.activeFilterCount > 0;

  /* Open pipeline value: what is still winnable. Rolling won and lost into one
     headline number would make it meaningless. */
  const openValue = useMemo(
    () => sumByCurrency(deals.filter((deal) => deal.status === 'open')),
    [deals],
  );

  const meta = loading
    ? undefined
    : `${pluralize(deals.length, 'deal')} · ${
        openValue.length === 0
          ? formatCurrency(0, settings?.defaultCurrency ?? 'USD')
          : openValue
              .map((entry) => formatCurrency(entry.total, entry.currency))
              .join(' + ')
      } open`;

  const onOpenDeal = useCallback((deal: Deal) => navigate(`/deals/${deal.id}`), [navigate]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pipeline"
        meta={meta}
        actions={
          canEdit && (
            <Button variant="primary" icon={<IconPlus size={16} />} onClick={() => openCreate()}>
              New deal
            </Button>
          )
        }
        toolbar={
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search deals…"
            activeFilterCount={list.activeFilterCount}
            onClearFilters={list.clearFilters}
            filters={
              <FilterSelect
                label="Filter by owner"
                allLabel="Any owner"
                value={list.filters.ownerId ?? ''}
                onChange={(value) => list.setFilter('ownerId', value)}
                options={users.map((u) => ({ value: u.id, label: u.name }))}
              />
            }
          />
        }
      />

      {error ? (
        <Card>
          <ErrorState description={error.message} onRetry={refresh} />
        </Card>
      ) : sessionLoading || (loading && deals.length === 0) ? (
        <BoardSkeleton columns={Math.max(stages.length, 4)} />
      ) : stages.length === 0 ? (
        <Card>
          <EmptyState
            title="No pipeline stages"
            description="A pipeline needs at least one stage before it can hold a deal. Stages are configured in Settings."
            action={<Button onClick={() => navigate('/settings')}>Open settings</Button>}
          />
        </Card>
      ) : deals.length === 0 && narrowed ? (
        <Card>
          <EmptyState
            title="No deals match"
            description="Nothing in the pipeline fits that search and those filters. Widen one of them to see deals again."
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
        </Card>
      ) : (
        <PipelineBoard
          stages={stages}
          deals={deals}
          user={user}
          loading={loading}
          canEdit={canEdit}
          onOpenDeal={onOpenDeal}
          onCreateInStage={openCreate}
        />
      )}

      <DealForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaults={createDefaults}
      />
    </div>
  );
}

function BoardSkeleton({ columns }: { columns: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="flex w-72 shrink-0 flex-col gap-2 rounded-card bg-surface-sunken/60 p-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-16 rounded-card" />
          <Skeleton className="h-16 rounded-card" />
        </div>
      ))}
    </div>
  );
}
