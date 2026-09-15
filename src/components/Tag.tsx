import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

/* Tags and status pills. `tone` is semantic, not decorative: neutral for
   metadata, positive for won/done, accent for anything needing action. */

export type TagTone = 'neutral' | 'accent' | 'positive' | 'success' | 'warn' | 'danger';

const TONES: Record<TagTone, string> = {
  neutral: 'bg-surface-sunken text-ink-500',
  accent: 'bg-accent-100 text-accent-600',
  positive: 'bg-positive-100 text-positive-600',
  success: 'bg-positive-100 text-positive-600',
  warn: 'bg-warn-100 text-warn-500',
  danger: 'bg-danger-100 text-danger-600',
};

export interface TagProps {
  tone?: TagTone;
  children: ReactNode;
  className?: string;
  /** Renders a small dismiss affordance; the caller owns the removal. */
  onRemove?: () => void;
}

export function Tag({ tone = 'neutral', children, className, onRemove }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5',
        'text-xs font-medium leading-5',
        TONES[tone],
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-0.5 rounded px-0.5 text-current opacity-60 hover:opacity-100"
          aria-label={`Remove ${typeof children === 'string' ? children : 'tag'}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
