import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KeyboardEvent } from 'react';
import { HeatLabel, HeatStripe } from '@/components/HeatStripe';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { dealHeat } from '@/lib/heat';
import type { Deal, ID } from '@/data/types';

/* One deal on the board.
 *
 * The whole card is the drag handle — a separate grip target is a smaller
 * thing to hit and buys nothing here, because the pointer sensor only starts a
 * drag after ~6px of travel, which leaves a plain click free to open the deal.
 */

export interface DealCardProps {
  deal: Deal;
  stageId: ID;
  companyName?: string;
  contactName?: string;
  onOpen?: (deal: Deal) => void;
  /** Rendered inside a DragOverlay: no sortable wiring, no click target. */
  overlay?: boolean;
}

export function DealCard({ deal, stageId, companyName, contactName, onOpen, overlay }: DealCardProps) {
  const sortable = useSortable({
    id: deal.id,
    // The board reads this to know which column a card came from.
    data: { stageId },
    disabled: overlay,
  });

  const heat = dealHeat(deal);
  const subtitle = [companyName, contactName].filter(Boolean).join(' · ');

  /* The keyboard sensor arrives as listeners.onKeyDown, so it has to be pulled
     out and called explicitly — spreading the listeners and then setting our
     own onKeyDown would replace it, and keyboard dragging would stop working
     without anything visibly breaking. */
  const { onKeyDown: startKeyboardDrag, ...dragListeners } = sortable.listeners ?? {};

  const onKeyDown = (event: KeyboardEvent) => {
    startKeyboardDrag?.(event);
    if (event.defaultPrevented) return;
    // Space is the sensor's (pick up / drop), so Enter is what opens the
    // record. Both stay available on the same focused card.
    if (event.key === 'Enter' && onOpen) {
      event.preventDefault();
      onOpen(deal);
    }
  };

  return (
    <article
      ref={overlay ? undefined : sortable.setNodeRef}
      style={
        overlay
          ? undefined
          : { transform: CSS.Translate.toString(sortable.transform) }
      }
      {...(overlay ? {} : sortable.attributes)}
      {...(overlay ? {} : dragListeners)}
      onClick={onOpen && !overlay ? () => onOpen(deal) : undefined}
      onKeyDown={overlay ? undefined : onKeyDown}
      className={cn(
        'flex gap-2.5 rounded-card border border-ink-100 bg-surface-card p-2.5 text-left shadow-sm',
        !overlay && 'cursor-grab active:cursor-grabbing',
        // The dragged card stays in place as a ghost; the DragOverlay is what
        // follows the pointer.
        !overlay && sortable.isDragging && 'opacity-40',
        !overlay && !sortable.isDragging && 'motion-safe:transition-transform',
        overlay && 'cursor-grabbing rotate-1 shadow-lg',
      )}
    >
      <HeatStripe heat={heat} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-ink-900">{deal.title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-ink-300">{subtitle}</p>}
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="tnum font-mono text-sm font-medium text-ink-700">
            {formatCurrency(deal.value, deal.currency)}
          </span>
          <HeatLabel heat={heat} />
        </div>
      </div>
    </article>
  );
}
