import type { TagTone } from '@/components/Tag';
import type { Deal, DealStatus, ID, PipelineStage } from '@/data/types';
import { formatCurrency } from '@/lib/format';
import { dealHeat } from '@/lib/heat';

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  open: 'Open',
  won: 'Won',
  lost: 'Lost',
};

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

export function sortByHeat(deals: Deal[], now = new Date()): Deal[] {
  return [...deals].sort((a, b) => {
    const ha = dealHeat({ ...a, now });
    const hb = dealHeat({ ...b, now });
    if (hb.scalar !== ha.scalar) return hb.scalar - ha.scalar;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function sumByCurrency(deals: Deal[]): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const deal of deals) {
    totals.set(deal.currency, (totals.get(deal.currency) ?? 0) + (deal.value || 0));
  }
  return [...totals.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);
}

export function formatStageTotal(deals: Deal[]): string {
  const sums = sumByCurrency(deals);
  if (sums.length === 0) return formatCurrency(0, 'USD', { compact: true });
  return sums
    .map((entry) => formatCurrency(entry.total, entry.currency, { compact: true }))
    .join(' + ');
}

const STAGE_PREFIX = 'stage:';

export const stageDroppableId = (stageId: ID): string => `${STAGE_PREFIX}${stageId}`;

export function stageIdFromDroppable(id: string | number | null | undefined): ID | null {
  if (id == null) return null;
  const raw = String(id);
  return raw.startsWith(STAGE_PREFIX) ? raw.slice(STAGE_PREFIX.length) : null;
}
