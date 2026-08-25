import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Heat } from '@/lib/heat';
import type { SortDirection } from '@/data/types';
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
  key: string;
  header: ReactNode;
  render: (item: T) => ReactNode;
  /** Field name to sort by; omit to make the column unsortable. */
  sortField?: string;
  align?: 'left' | 'right';
  width?: string;
  mobile?: 'primary' | 'secondary' | 'pair' | 'desktop';
  className?: string;
}

export interface TableProps<T> {
  items: T[];
  columns: Column<T>[];
  rowKey: (item: T) => string;
  sort?: { field: string; dir: SortDirection };
  onSortChange?: (sort: { field: string; dir: SortDirection }) => void;
  onRowClick?: (item: T) => void;
  /** Adds the signature heat edge to each row. */
  heat?: (item: T) => Heat;
  loading?: boolean;
  /** Shown when there are no items and nothing is loading. */
  empty?: ReactNode;
  className?: string;
}

export function Table<T>({
  items,
  columns,
  rowKey,
  sort,
  onSortChange,
  onRowClick,
  heat,
  loading = false,
  empty,
  className,
}: TableProps<T>) {
  if (loading && items.length === 0) return <SkeletonRows className={className} />;
  if (!loading && items.length === 0 && empty) return <>{empty}</>;

  const toggleSort = (field: string) => {
    if (!onSortChange) return;
    const dir: SortDirection = sort?.field === field && sort.dir === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, dir });
  };

  const interactive = Boolean(onRowClick);

  return (
    <div className={cn('w-full', loading && 'opacity-60', className)}>
      {/* Desktop: a real table, so screen readers get real row/column semantics. */}
      <div className="scroll-slim hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-100">
              {heat && <th className="w-[3px] p-0" aria-hidden="true" />}
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
                    {column.sortField && onSortChange ? (
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
                key={rowKey(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(item);
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
                {heat && (
                  <td className="p-0">
                    <div className="flex h-full min-h-[2.75rem] items-stretch py-1.5 pl-1.5">
                      <HeatStripe heat={heat(item)} />
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
            <li key={rowKey(item)}>
              <div
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(item);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'flex gap-3 rounded-card border border-ink-100 bg-surface-card p-3 shadow-sm',
                  interactive && 'cursor-pointer active:bg-surface-app',
                )}
              >
                {heat && <HeatStripe heat={heat(item)} />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink-900">{primary.render(item)}</div>
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
