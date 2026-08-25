import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* One page title treatment, used by every module so pages cannot drift apart. */

export interface PageHeaderProps {
  title: string;
  /** Count or one-line context, e.g. "128 contacts". */
  meta?: ReactNode;
  description?: string;
  actions?: ReactNode;
  /** Filter row, tabs, or search — sits under the title, above the content. */
  toolbar?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  meta,
  description,
  actions,
  toolbar,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink-900">
              {title}
            </h1>
            {meta && <span className="text-xs text-ink-300 tnum">{meta}</span>}
          </div>
          {description && <p className="mt-1 max-w-2xl text-base text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {toolbar}
    </header>
  );
}
