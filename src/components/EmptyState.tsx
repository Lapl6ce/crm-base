import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { tokens } from '@/lib/tokens';

/* Empty states say what to do next and give the control to do it — never
   "No data" (CONTEXT.md §4).
 *
 * The illustration is the heat motif at rest: the same stripes that mark hot
 * records, here cold and waiting. It ties the zero state to the rest of the app
 * without needing an illustration library. */

export interface EmptyStateProps {
  title: string;
  /** One sentence of instruction. Say the next action, not the situation. */
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  /** Compact variant for empty columns inside the Kanban board. */
  size?: 'md' | 'sm';
}

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'md' ? 'gap-3 px-6 py-14' : 'gap-2 px-3 py-8',
        className,
      )}
    >
      <StripeMark compact={size === 'sm'} />
      <h3 className={cn('font-display font-semibold text-ink-900', size === 'md' ? 'text-md' : 'text-base')}>
        {title}
      </h3>
      <p className={cn('max-w-sm text-ink-500', size === 'md' ? 'text-base' : 'text-xs')}>
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

function StripeMark({ compact }: { compact: boolean }) {
  const width = compact ? 56 : 84;
  return (
    <svg
      width={width}
      height={compact ? 34 : 50}
      viewBox="0 0 84 50"
      fill="none"
      aria-hidden="true"
      className="mb-1"
    >
      {[0, 1, 2, 3].map((row) => (
        <g key={row} opacity={1 - row * 0.22}>
          <rect x="4" y={4 + row * 12} width="3" height="9" rx="1.5" fill={tokens.ink[150]} />
          <rect
            x="13"
            y={4 + row * 12}
            width={62 - row * 11}
            height="9"
            rx="2"
            fill={tokens.surface.sunken}
          />
        </g>
      ))}
    </svg>
  );
}

/** The failure twin of EmptyState — same shape, so layouts do not shift. */
export function ErrorState({
  title = 'That did not load',
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-100 text-lg text-danger-600"
        aria-hidden="true"
      >
        !
      </span>
      <h3 className="font-display text-md font-semibold text-ink-900">{title}</h3>
      <p className="max-w-sm text-base text-ink-500">
        {description ?? 'Something went wrong reading your data. Try again.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded px-3 py-1.5 text-base font-medium text-accent-600 hover:bg-accent-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}
