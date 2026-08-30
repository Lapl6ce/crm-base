import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import type { Deal, PipelineStage } from '@/data/types';
import { formatStageTotal, stageDroppableId, STAGE_OUTCOME_LABEL } from './dealMeta';

/* One pipeline column.
 *
 * The droppable is the column, not the list of cards, so an empty column is
 * still a target — otherwise the first deal could never be dragged into
 * "Qualified", which is exactly the move people make most.
 */

export interface StageColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  children: ReactNode;
  /** Shown when the column has no deals. */
  empty: ReactNode;
}

export function StageColumn({ stage, deals, children, empty }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stageDroppableId(stage.id),
    data: { stageId: stage.id },
  });

  return (
    <section
      className="flex w-72 shrink-0 snap-start flex-col rounded-card bg-surface-sunken/60"
      aria-label={`${stage.name}, ${pluralize(deals.length, 'deal')}`}
    >
      <header className="flex items-baseline justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <h2 className="truncate font-display text-base font-semibold text-ink-900">
            {stage.name}
          </h2>
          <span className="tnum shrink-0 text-xs text-ink-300">{deals.length}</span>
        </div>
        <span className="tnum shrink-0 font-mono text-xs text-ink-500">
          {formatStageTotal(deals)}
        </span>
      </header>

      {/* A terminal stage is labelled, so a renamed pipeline still says which
          columns end a deal (CONTEXT.md §1: outcome drives Deal.status). */}
      {stage.outcome !== 'open' && (
        <p className="px-3 pb-1.5 text-2xs uppercase tracking-wide text-ink-300">
          Closes as {STAGE_OUTCOME_LABEL[stage.outcome].toLowerCase()}
        </p>
      )}

      <div
        ref={setNodeRef}
        className={cn(
          'scroll-slim flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto rounded-b-card p-2 pt-1',
          'motion-safe:transition-colors',
          isOver && 'bg-accent-100/60 ring-1 ring-inset ring-accent-500/40',
        )}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        {deals.length === 0 && empty}
      </div>
    </section>
  );
}
