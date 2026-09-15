import type { SortDirection } from '@/data/types';
import { cn } from '@/lib/cn';
import type { Heat } from '@/lib/heat';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeatStripe } from './HeatStripe';
import { IconChevronDown } from './icons';
import { SkeletonRows } from './Skeleton';

/* The data table every list view is built from.
 *
 * Below `md` it stops being a table and becomes a stack of cards — the same
 * columns, relabelled — because a horizontally scrolling table on a phone is a
 * table nobody reads. Columns opt into that view by declaring their role:
 *   primary   -> the card's title line
 *   secondary -> the line under it
 *   (default) -> a label/value pair in the card body
 *   'desktop' -> dropped entirely on small screens
 */

export interface Column<T> {
  key?: string;
  id?: string;
  header: ReactNode;
  render?: (item: T) => ReactNode;
  cell?: (item: T) => ReactNode;
  /** Field name to sort by; omit to make the column unsortable. */
  sortField?: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  width?: string;
  mobile?: 'primary' | 'secondary' | 'pair' | 'desktop';
  className?: string;
}

export interface TableProps<T> {
  items?: T[];
  data?: T[];
  columns?: Column<T>[];
  rowKey?: (item: T) => string;
  keyField?: string;
  sort?: { field: string; dir: SortDirection };
  onSortChange?: (sort: { field: string; dir: SortDirection }) => void;
  onSort?: (sort: { field: string; dir: SortDirection }) => void;
  onRowClick?: (item: T) => void;
  /** Adds the signature heat edge to each row. */
  heat?: (item: T) => Heat;
  getRowHeat?: (item: T) => Heat;
  getRowLink?: (item: T) => string;
  loading?: boolean;
  /** Shown when there are no items and nothing is loading. */
  empty?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function Table<T>({
  items: propItems,
  data,
  columns: rawColumns,
  rowKey: propRowKey,
  keyField,
  sort,
  onSortChange,
  onSort,
  onRowClick,
  heat,
  getRowHeat,
  getRowLink,
  loading = false,
  empty,
  className,
  children,
}: TableProps<T>) {
  const navigate = useNavigate();

  if (children) {
    return (
      <div className={cn('scroll-slim w-full overflow-x-auto', className)}>
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  }

  const items = propItems ?? data ?? [];
  const columns = (rawColumns ?? []).map((col) => {
    const key = col.key ?? col.id ?? String(Math.random());
    return {
      ...col,
      key,
      sortField: col.sortField ?? (col.sortable ? key : undefined),
      render: col.render ?? col.cell ?? (() => null),
    };
  });

  const effectiveSortChange = onSortChange ?? onSort;
  const effectiveHeat = heat ?? getRowHeat;
  const effectiveRowClick =
    onRowClick ?? (getRowLink ? (item: T) => navigate(getRowLink(item)) : undefined);

  const getRowKey = (item: T): string => {
    if (propRowKey) return propRowKey(item);
    if (keyField && typeof item === 'object' && item !== null && keyField in item) {
      return String((item as Record<string, unknown>)[keyField]);
    }
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return String((item as Record<string, unknown>).id);
    }
    return String(Math.random());
  };

  if (loading && items.length === 0) return <SkeletonRows className={className} />;
  if (!loading && items.length === 0 && empty) return <>{empty}</>;

  const toggleSort = (field: string) => {
    if (!effectiveSortChange) return;
    const dir: SortDirection = sort?.field === field && sort.dir === 'asc' ? 'desc' : 'asc';
    effectiveSortChange({ field, dir });
  };

  const interactive = Boolean(effectiveRowClick);

  return (
    <div className={cn('w-full', loading && 'opacity-60', className)}>
      {/* Desktop: a real table, so screen readers get real row/column semantics. */}
      <div className="scroll-slim hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-100">
              {effectiveHeat && <th className="w-[3px] p-0" aria-hidden="true" />}
              {columns.map((column) => {
                const active = sort?.field === column.sortField;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={
                      active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-ink-300',
                      column.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {column.sortField && effectiveSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.sortField as string)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded hover:text-ink-700',
                          active && 'text-ink-700',
                        )}
                      >
                        {column.header}
                        <IconChevronDown
                          size={12}
                          className={cn(
                            'motion-safe:transition-transform',
                            !active && 'opacity-0',
                            active && sort?.dir === 'asc' && 'rotate-180',
                          )}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={getRowKey(item)}
                onClick={effectiveRowClick ? () => effectiveRowClick(item) : undefined}
                onKeyDown={
                  effectiveRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          effectiveRowClick(item);
                        }
                      }
                    : undefined
                }
                tabIndex={interactive ? 0 : undefined}
                className={cn(
                  'border-b border-ink-100 bg-surface-card last:border-0',
                  interactive && 'cursor-pointer hover:bg-surface-app',
                )}
              >
                {effectiveHeat && (
                  <td className="p-0">
                    <div className="flex h-full min-h-[2.75rem] items-stretch py-1.5 pl-1.5">
                      <HeatStripe heat={effectiveHeat(item)} />
                    </div>
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2.5 text-ink-700',
                      column.align === 'right' && 'text-right',
                      column.className,
                    )}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: the same data as cards. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {items.map((item) => {
          const primary = columns.find((c) => c.mobile === 'primary') ?? columns[0];
          const secondary = columns.find((c) => c.mobile === 'secondary');
          const pairs = columns.filter(
            (c) => c !== primary && c !== secondary && c.mobile !== 'desktop',
          );
          return (
            <li key={getRowKey(item)}>
              <div
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onClick={effectiveRowClick ? () => effectiveRowClick(item) : undefined}
                onKeyDown={
                  effectiveRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          effectiveRowClick(item);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'flex gap-3 rounded-card border border-ink-100 bg-surface-card p-3 shadow-sm',
                  interactive && 'cursor-pointer active:bg-surface-app',
                )}
              >
                {effectiveHeat && <HeatStripe heat={effectiveHeat(item)} />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink-900">{primary?.render(item)}</div>
                  {secondary && <div className="mt-0.5 text-xs text-ink-500">{secondary.render(item)}</div>}
                  {pairs.length > 0 && (
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {pairs.map((column) => (
                        <div key={column.key} className="min-w-0">
                          <dt className="text-2xs uppercase tracking-wide text-ink-300">
                            {column.header}
                          </dt>
                          <dd className="truncate text-xs text-ink-700">{column.render(item)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TableHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={cn('border-b border-ink-100', className)}>{children}</thead>;
}

export function TableBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn('divide-y divide-ink-100', className)}>{children}</tbody>;
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}) {
  return (
    <tr className={cn('hover:bg-surface-app/50 transition-colors', className)} onClick={onClick}>
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className,
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <th
      style={style}
      className={cn(
        'px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-ink-300',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  colSpan,
  style,
  onClick,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  style?: CSSProperties;
  onClick?: (event: React.MouseEvent) => void;
}) {
  return (
    <td colSpan={colSpan} style={style} onClick={onClick} className={cn('px-3 py-2.5 text-sm text-ink-700', className)}>
      {children}
    </td>
  );
}
