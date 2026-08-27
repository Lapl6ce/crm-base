import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { SearchInput, Select } from './Field';

/* The filter row above every list. Search on the left, filter selects on the
   right, and a clear affordance that only exists when there is something to
   clear — a permanently visible "Clear filters" trains people to ignore it. */

export interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** <FilterSelect> elements. */
  filters?: ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  className?: string;
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  activeFilterCount = 0,
  onClearFilters,
  className,
}: ListToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-2 lg:flex-row lg:items-center', className)}>
      <div className="lg:w-72">
        <SearchInput
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </div>
      {filters && (
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {filters}
          {activeFilterCount > 0 && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded px-2 py-1 text-xs font-medium text-ink-500 hover:bg-ink-100/70 hover:text-ink-900"
            >
              Clear {activeFilterCount === 1 ? 'filter' : `${activeFilterCount} filters`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** The "no filter" row, e.g. "Any status". */
  allLabel: string;
  className?: string;
}

/** A filter is a Select whose label is its placeholder row — no stacked labels
    eating vertical space above a table. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: FilterSelectProps) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn('w-auto min-w-[9rem] text-base', value && 'border-ink-300 font-medium', className)}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
