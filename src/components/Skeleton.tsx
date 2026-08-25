import { cn } from '@/lib/cn';

/* Loading placeholders. The shimmer is motion-gated; with reduced motion it is
   a flat block, which still communicates "content is coming". */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded bg-surface-sunken',
        'motion-safe:animate-shimmer motion-safe:bg-[linear-gradient(90deg,transparent,rgb(var(--color-surface-card)/0.7),transparent)] motion-safe:bg-[length:200%_100%]',
        className,
      )}
      aria-hidden="true"
    />
  );
}

/** Table-shaped placeholder, so lists do not jump when data lands. */
export function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-px', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-surface-card px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 w-[22%]" />
          <Skeleton className="h-3 w-[30%]" />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
