import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconPlus } from '@/components/icons';
import { toast } from '@/components/Toast';
import type { Deal, ID, PipelineStage, User } from '@/data/types';
import { fullName } from '@/lib/format';
import { DealCard } from './DealCard';
import { sortByHeat, stageIdFromDroppable } from './dealMeta';
import { StageColumn } from './StageColumn';
import { useDealLookups, useDealMutations } from './useDeals';

export interface PipelineBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  user: User | null;
  loading: boolean;
  canEdit: boolean;
  onOpenDeal: (deal: Deal) => void;
  onCreateInStage: (stageId: ID) => void;
}

export function PipelineBoard({
  stages,
  deals,
  user,
  loading,
  canEdit,
  onOpenDeal,
  onCreateInStage,
}: PipelineBoardProps) {
  const { lookups } = useDealLookups();
  const { move } = useDealMutations();

  const [pending, setPending] = useState<Record<ID, ID>>({});
  const [draggingId, setDraggingId] = useState<ID | null>(null);

  useEffect(() => {
    setPending((current) => {
      if (Object.keys(current).length === 0) return current;
      const next = { ...current };
      let changed = false;
      for (const [dealId, stageId] of Object.entries(current)) {
        const deal = deals.find((d) => d.id === dealId);
        if (!deal || deal.stageId === stageId) {
          delete next[dealId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [deals]);

  const stageOf = (deal: Deal): ID => pending[deal.id] ?? deal.stageId;

  const byStage = useMemo(() => {
    const grouped = new Map<ID, Deal[]>(stages.map((stage) => [stage.id, []]));
    for (const deal of deals) {
      const target = grouped.has(stageOf(deal)) ? stageOf(deal) : stages[0]?.id;
      if (target) grouped.get(target)?.push(deal);
    }
    for (const [stageId, list] of grouped) grouped.set(stageId, sortByHeat(list));
    return grouped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, stages, pending]);

  const dealById = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);
  const dragging = draggingId ? dealById.get(draggingId) : null;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space],
      },
    }),
  );

  const resolveStage = (overId: string | number | null | undefined): ID | null => {
    const asStage = stageIdFromDroppable(overId);
    if (asStage) return asStage;
    const overDeal = overId == null ? undefined : dealById.get(String(overId));
    return overDeal ? stageOf(overDeal) : null;
  };

  const onDragStart = (event: DragStartEvent) => setDraggingId(String(event.active.id));

  const onDragEnd = async (event: DragEndEvent) => {
    setDraggingId(null);
    const dealId = String(event.active.id);
    const deal = dealById.get(dealId);
    const targetStageId = resolveStage(event.over?.id);
    if (!deal || !targetStageId) return;

    const fromStageId = stageOf(deal);
    if (fromStageId === targetStageId) return;

    setPending((current) => ({ ...current, [dealId]: targetStageId }));

    try {
      await move.run(dealId, targetStageId, user?.id ?? deal.ownerId);
      const stage = stageById.get(targetStageId);
      toast.success(`${deal.title} moved to ${stage?.name ?? 'a new stage'}`);
    } catch (error) {
      setPending((current) => {
        const next = { ...current };
        delete next[dealId];
        return next;
      });
      toast.error(error instanceof Error ? error.message : 'That move did not stick');
    }
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up deal ${dealById.get(String(active.id))?.title ?? ''}.`,
    onDragOver: ({ active, over }) => {
      const stage = stageById.get(resolveStage(over?.id) ?? '');
      if (!stage) return undefined;
      return `Deal ${dealById.get(String(active.id))?.title ?? ''} is over ${stage.name}.`;
    },
    onDragEnd: ({ active, over }) => {
      const stage = stageById.get(resolveStage(over?.id) ?? '');
      const title = dealById.get(String(active.id))?.title ?? '';
      return stage ? `Deal ${title} was moved to ${stage.name}.` : `Deal ${title} was dropped.`;
    },
    onDragCancel: ({ active }) =>
      `Moving deal ${dealById.get(String(active.id))?.title ?? ''} was cancelled.`,
  };

  const nameFor = (deal: Deal) => ({
    companyName: deal.companyId ? lookups.companyById.get(deal.companyId)?.name : undefined,
    contactName: deal.contactId
      ? fullName(lookups.contactById.get(deal.contactId) ?? {}) || undefined
      : undefined,
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Press Space to pick up this deal, arrow keys to move it between stages, Space to drop, Escape to cancel. Press Enter to open the deal instead.',
        },
      }}
    >
      <div className="scroll-slim -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 sm:-mx-5 sm:px-5">
        {stages.map((stage) => {
          const stageDeals = byStage.get(stage.id) ?? [];
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              empty={
                loading ? null : (
                  <EmptyState
                    size="sm"
                    title={`Nothing in ${stage.name}`}
                    description={
                      canEdit
                        ? 'Drag a deal over, or create one here.'
                        : 'Deals dragged into this stage will show up here.'
                    }
                    action={
                      canEdit && (
                        <Button
                          size="sm"
                          icon={<IconPlus size={14} />}
                          onClick={() => onCreateInStage(stage.id)}
                        >
                          New deal
                        </Button>
                      )
                    }
                  />
                )
              }
            >
              {stageDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  stageId={stage.id}
                  onOpen={onOpenDeal}
                  {...nameFor(deal)}
                />
              ))}
            </StageColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <DealCard deal={dragging} stageId={stageOf(dragging)} overlay {...nameFor(dragging)} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
