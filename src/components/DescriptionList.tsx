import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* The label/value grid every detail panel is built from. One implementation so
   a contact and a company read identically, and so "—" for an empty field is
   decided in one place rather than per screen. */

export function DescriptionList({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode;
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        className,
      )}
    >
      {children}
    </dl>
  );
}

export interface DescriptionItemProps {
  label: string;
  children?: ReactNode;
  /** Shown when children is null/undefined/''. */
  empty?: string;
  /** Spans both columns — addresses and tag rows. */
  wide?: boolean;
}

export function DescriptionItem({ label, children, empty = '—', wide }: DescriptionItemProps) {
  const isEmpty = children === null || children === undefined || children === '';
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-300">{label}</dt>
      <dd className={cn('mt-1 break-words text-base', isEmpty ? 'text-ink-300' : 'text-ink-700')}>
        {isEmpty ? empty : children}
      </dd>
    </div>
  );
}
