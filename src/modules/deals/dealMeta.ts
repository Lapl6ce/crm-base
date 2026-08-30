import type { TagTone } from '@/components/Tag';
import type { Deal, DealStatus, ID, PipelineStage } from '@/data/types';
import { formatCurrency } from '@/lib/format';
import { dealHeat } from '@/lib/heat';

/* Module-local vocabulary for deals, plus the two bits of arithmetic the board
   needs. Nothing outside Deals has an opinion about any of it. */

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  open: 'Open',
  won: 'Won',
  lost: 'Lost',
};

/* Won is the one unambiguously good state in the app, so it gets `positive`.
   Open is neutral — it is the default condition of a pipeline, not a signal. */
export const DEAL_STATUS_TONE: Record<DealStatus, TagTone> = {
  open: 'neutral',
  won: 'positive',
  lost: 'danger',
};

export const STAGE_OUTCOME_LABEL: Record<PipelineStage['outcome'], string> = {
  open: 'Open',
  won: 'Won',
  lost: 'Lost',
};

/**
 * Column order is by heat, hottest first (lib/heat.ts).
 *
 * Deal has no per-stage `order` field, and inventing one would mean the board
 * owned an ordering the data layer could not persist. Sorting by urgency is
 * both honest about that and the more useful default: the top of every column
 * is the deal that needs you most. It also means dragging a card *within* a
 * column is meaningless, which is why the board only commits moves that cross
 * a column boundary.
 */
export function sortByHeat(deals: Deal[], now = new Date()): Deal[] {
  return [...deals].sort((a, b) => {
    const ha = dealHeat({ ...a, now });
    const hb = dealHeat({ ...b, now });
    if (hb.scalar !== ha.scalar) return hb.scalar - ha.scalar;
    // Stable tie-break, so equal-heat cards do not shuffle between renders.
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/**
 * Deals carry their own currency code, so a column total is a sum *per
 * currency* — adding 4 EUR to 3 USD to get 7 of nothing is the kind of number
 * people make decisions on. In practice every deal takes the settings default
 * and this returns a single entry.
 */
export function sumByCurrency(deals: Deal[]): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const deal of deals) {
    totals.set(deal.currency, (totals.get(deal.currency) ?? 0) + (deal.value || 0));
  }
  return [...totals.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);
}

/** "$42.5K" — or "$42.5K + €3K" on the rare mixed-currency column. */
export function formatStageTotal(deals: Deal[]): string {
  const sums = sumByCurrency(deals);
  if (sums.length === 0) return formatCurrency(0, 'USD', { compact: true });
  return sums
    .map((entry) => formatCurrency(entry.total, entry.currency, { compact: true }))
    .join(' + ');
}

/* The board has two kinds of drop target — a column, and a card inside one —
   so column ids are namespaced to tell them apart. Encoding and decoding live
   together here; a format one file writes and another parses by hand is a bug
   waiting for someone to change the prefix. */

const STAGE_PREFIX = 'stage:';

export const stageDroppableId = (stageId: ID): string => `${STAGE_PREFIX}${stageId}`;

/** Returns null when the id is not a column (i.e. it is a deal card). */
export function stageIdFromDroppable(id: string | number | null | undefined): ID | null {
  if (id == null) return null;
  const raw = String(id);
  return raw.startsWith(STAGE_PREFIX) ? raw.slice(STAGE_PREFIX.length) : null;
}
