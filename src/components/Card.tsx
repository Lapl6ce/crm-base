import { cn } from '@/lib/cn';
import type { HTMLAttributes, ReactNode } from 'react';

/* The work surface. White, 8px radius, one shadow — every panel in the app is
   this or a Table. */

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-ink-100 bg-surface-card shadow-sm', className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3',
        className,
      )}
    >
      <div>
        <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}
