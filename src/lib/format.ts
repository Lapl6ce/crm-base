import { format, formatDistanceToNowStrict, isThisYear, isToday, isValid, parseISO } from 'date-fns';

/* Formatting is centralized so a fork can switch locale/currency conventions in
   one file. Everything is null-tolerant: records come from a mock adapter today
   and a partial API response tomorrow. */

const parse = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
};

export function formatCurrency(
  value: number | null | undefined,
  currency = 'USD',
  opts: { compact?: boolean } = {},
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.compact ? 1 : value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

/** "12 Mar" this year, "12 Mar 2024" otherwise. */
export function formatDate(iso?: string | null): string {
  const d = parse(iso);
  if (!d) return '—';
  return format(d, isThisYear(d) ? 'd MMM' : 'd MMM yyyy');
}

export function formatDateTime(iso?: string | null): string {
  const d = parse(iso);
  if (!d) return '—';
  return isToday(d) ? format(d, "'today' HH:mm") : format(d, 'd MMM yyyy, HH:mm');
}

/** "3d ago" — for timelines and last-touched columns. */
export function formatRelative(iso?: string | null): string {
  const d = parse(iso);
  if (!d) return '—';
  return `${formatDistanceToNowStrict(d, { unit: undefined })} ago`;
}

/** Date input value ("2026-08-25") from an ISO timestamp. */
export function toDateInputValue(iso?: string | null): string {
  const d = parse(iso);
  return d ? format(d, 'yyyy-MM-dd') : '';
}

/** ISO timestamp from a date input value; noon UTC avoids timezone slippage. */
export function fromDateInputValue(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T12:00:00`);
  return isValid(d) ? d.toISOString() : undefined;
}

export function fullName(parts: { firstName?: string; lastName?: string }): string {
  return [parts.firstName, parts.lastName].filter(Boolean).join(' ').trim();
}

/** "Ada Lovelace" -> "AL"; single words -> first two letters. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function truncate(text: string, max = 80): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
