import { differenceInCalendarDays, parseISO } from 'date-fns';
import { hexToRgb, rampAt, rgbToHex, tokens, type RGB } from './tokens';

/* ---------------------------------------------------------------------------
   The heat system — Signal's signature element (CONTEXT.md §4).

   One question, asked of every record in the app: *how much does this need me
   right now?* The answer is a 0..1 scalar, rendered as a 3px stripe on the left
   edge of the row / card / timeline entry.

   Two rules this file exists to guarantee:
     1. Heat is computed in exactly ONE place. A fork retunes urgency for its
        client (SLA breach for field service, reorder point for retail) by
        editing this file and nothing else.
     2. Heat is NEVER the only signal. Every result carries a `label` that says
        the same thing in words ("overdue 2d"), so the stripe is redundant
        colour, safe for colour blindness and greyscale printing.

   Inputs are primitives, not entities, so lib/ stays free of data/ imports.
   --------------------------------------------------------------------------- */

export type HeatTone = 'idle' | 'cold' | 'warm' | 'hot';

export interface Heat {
  /** 0 = cold/ignorable, 1 = needs attention now. */
  scalar: number;
  /** Hex from the mute -> warn -> coral ramp. */
  color: string;
  /** Human-readable equivalent of the colour. Always render this too. */
  label: string;
  tone: HeatTone;
  /** True when the record is settled (won, lost, completed) — stripe goes flat. */
  settled: boolean;
}

const RAMP: RGB[] = [
  hexToRgb(tokens.ink[300])!, // cold: recedes
  hexToRgb(tokens.warn[500])!, // warming
  hexToRgb(tokens.accent[500])!, // act on this
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function heatColor(scalar: number): string {
  return rgbToHex(rampAt(RAMP, clamp01(scalar)));
}

export function heatTone(scalar: number): HeatTone {
  if (scalar >= 0.7) return 'hot';
  if (scalar >= 0.4) return 'warm';
  return 'cold';
}

const IDLE: Heat = {
  scalar: 0,
  color: tokens.ink[150],
  label: '',
  tone: 'idle',
  settled: true,
};

function toDays(iso: string | undefined, now: Date): number | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? null : differenceInCalendarDays(d, now);
}

function build(scalar: number, label: string, settled = false): Heat {
  const s = clamp01(scalar);
  return { scalar: s, color: heatColor(s), label, tone: heatTone(s), settled };
}

/** "in 3d" / "today" / "2d ago" — the words beside the stripe. */
function relativeDayLabel(days: number, overduePrefix = 'overdue'): string {
  if (days < 0) return `${overduePrefix} ${Math.abs(days)}d`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days}d`;
}

/* --- deals -------------------------------------------------------------- */

export interface DealHeatInput {
  expectedCloseDate?: string;
  stageEnteredAt?: string;
  status?: 'open' | 'won' | 'lost';
  now?: Date;
}

/**
 * Closing soon is urgent; sitting in one stage for weeks is urgent more slowly.
 * A deal with no close date can still go hot on staleness alone.
 */
export function dealHeat({
  expectedCloseDate,
  stageEnteredAt,
  status = 'open',
  now = new Date(),
}: DealHeatInput): Heat {
  if (status === 'won') return { ...IDLE, label: 'won' };
  if (status === 'lost') return { ...IDLE, label: 'lost' };

  const daysToClose = toDays(expectedCloseDate, now);
  const daysInStage = stageEnteredAt ? -(toDays(stageEnteredAt, now) ?? 0) : null;

  // Urgency from the close date: linear over a 30-day horizon, pinned at 1 once overdue.
  const closeUrgency = daysToClose === null ? 0 : daysToClose < 0 ? 1 : clamp01(1 - daysToClose / 30);

  // Urgency from stage age: a deal untouched for 45 days is fully stale.
  const staleUrgency = daysInStage === null ? 0 : clamp01(daysInStage / 45);

  const scalar =
    daysToClose === null ? staleUrgency : clamp01(closeUrgency * 0.7 + staleUrgency * 0.3);

  const label =
    daysToClose !== null
      ? `closes ${relativeDayLabel(daysToClose)}`
      : daysInStage !== null && daysInStage > 0
        ? `${daysInStage}d in stage`
        : 'no close date';

  return build(scalar, label);
}

/* --- tasks -------------------------------------------------------------- */

export type Priority = 'low' | 'medium' | 'high';

export interface TaskHeatInput {
  dueDate?: string;
  priority?: Priority;
  completed?: boolean;
  now?: Date;
}

const PRIORITY_WEIGHT: Record<Priority, number> = { low: 0.7, medium: 0.85, high: 1 };
/** High priority never reads as fully cold, even when it is not due for weeks. */
const PRIORITY_FLOOR: Record<Priority, number> = { low: 0, medium: 0.1, high: 0.25 };

export function taskHeat({
  dueDate,
  priority = 'medium',
  completed = false,
  now = new Date(),
}: TaskHeatInput): Heat {
  if (completed) return { ...IDLE, label: 'done' };

  const days = toDays(dueDate, now);
  const dueUrgency = days === null ? 0 : days < 0 ? 1 : clamp01(1 - days / 14);
  const scalar = Math.max(
    PRIORITY_FLOOR[priority],
    dueUrgency * PRIORITY_WEIGHT[priority] + PRIORITY_FLOOR[priority] * (1 - dueUrgency),
  );

  const label = days === null ? `${priority} priority` : `due ${relativeDayLabel(days)}`;
  return build(scalar, label);
}

/* --- contacts ------------------------------------------------------------ */

export interface ContactHeatInput {
  /** ISO timestamp of the most recent ActivityEvent touching this contact. */
  lastActivityAt?: string;
  now?: Date;
}

/**
 * Inverted from deals: for a person, heat means *neglect*. A contact you have
 * not touched in two months is the one that needs you.
 */
export function contactHeat({ lastActivityAt, now = new Date() }: ContactHeatInput): Heat {
  const days = lastActivityAt ? -(toDays(lastActivityAt, now) ?? 0) : null;
  if (days === null) return build(0.5, 'never contacted');
  const scalar = clamp01(days / 60);
  const label = days <= 0 ? 'active today' : `quiet ${days}d`;
  return build(scalar, label);
}
