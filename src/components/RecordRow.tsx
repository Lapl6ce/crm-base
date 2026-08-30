import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { Heat } from '@/lib/heat';
import { HeatStripe } from './HeatStripe';
import { IconChevronRight } from './icons';

/* A linked row in a "related records" panel: the people at a company, the
   deals on a contact, the tasks on a deal.
 *
 * It knows nothing about entities — title, subtitle, a trailing value and an
 * optional heat reading. That is what lets three modules that may not import
 * each other still render related records identically.
 */

export interface RecordRowProps {
  /** Omit for a record with no page of its own — a task, say. The row then
      renders as plain content instead of a link, with no false affordance. */
  to?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned primary value, e.g. money. Tabular by default. */
  trailing?: ReactNode;
  /** Small line under the trailing value — usually a HeatLabel. */
  trailingHint?: ReactNode;
  /** Adds the signature temperature edge. */
  heat?: Heat;
  leading?: ReactNode;
  className?: string;
}

export function RecordRow({
  to,
  title,
  subtitle,
  trailing,
  trailingHint,
  heat,
  leading,
  className,
}: RecordRowProps) {
  const content = (
    <>
      {heat && (
        <span className="flex min-h-8 items-stretch">
          <HeatStripe heat={heat} />
        </span>
      )}
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-ink-900">{title}</span>
        {subtitle && <span className="block truncate text-xs text-ink-300">{subtitle}</span>}
      </span>
      {(trailing || trailingHint) && (
        <span className="shrink-0 text-right">
          {trailing && (
            <span className="tnum block font-mono text-sm text-ink-700">{trailing}</span>
          )}
          {trailingHint && <span className="block">{trailingHint}</span>}
        </span>
      )}
      {to && <IconChevronRight size={16} className="shrink-0 text-ink-150" />}
    </>
  );

  const shared = cn('flex items-center gap-3 px-4 py-2.5', className);

  if (!to) return <div className={shared}>{content}</div>;

  return (
    <Link to={to} className={cn(shared, 'hover:bg-surface-app')}>
      {content}
    </Link>
  );
}
