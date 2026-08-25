import { cn } from '@/lib/cn';
import { Button } from './Button';
import { IconChevronLeft, IconChevronRight } from './icons';

/* Page N of M plus two arrows. Deliberately not a numbered pager: with search
   and sort available, deep page-hopping is not the behaviour to optimize. */

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className={cn('flex items-center justify-between gap-3 px-1 py-2', className)}>
      <p className="text-xs text-ink-500 tnum">
        {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <IconChevronLeft size={16} />
        </Button>
        <span className="px-1 text-xs text-ink-500 tnum" aria-live="polite">
          {page} / {lastPage}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Next page"
        >
          <IconChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
