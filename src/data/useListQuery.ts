import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ListQuery, SortDirection } from './types';

/* The state behind every list view: search, filters, sort, page.
 *
 * It lives here rather than in a module because both list screens need exactly
 * the same behaviour, and "exactly the same" is the thing that drifts first.
 * The output is a memoized ListQuery — stable by identity, so it can be handed
 * straight to useResource's dependency array without refetching every render.
 *
 * Filter values are plain strings because they come from <select>s, and the
 * query engine already treats '' as "no filter" (data/mock/collection.ts). An
 * empty control is therefore not a filter, with no special-casing here.
 */

export interface ListQueryOptions {
  /** Applied when the user has not chosen a sort. */
  defaultSort?: { field: string; dir: SortDirection };
  pageSize?: number;
  /** Keystroke settling time before a search hits the repository. */
  debounceMs?: number;
  initialFilters?: Record<string, string>;
  filters?: Record<string, string>;
}

export interface ListQueryState {
  /** Ready to pass to repository.list(). */
  query: ListQuery;
  /** The raw input value — updates on every keystroke, unlike query.search. */
  search: string;
  setSearch: (value: string) => void;
  filters: Record<string, string>;
  setFilter: (field: string, value: string) => void;
  clearFilters: () => void;
  /** Filters only; the search box shows its own clear affordance. */
  activeFilterCount: number;
  sort: { field: string; dir: SortDirection };
  setSort: (sort: { field: string; dir: SortDirection }) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
}

const DEFAULT_SORT: { field: string; dir: SortDirection } = { field: 'createdAt', dir: 'desc' };

export function useListQuery(options: ListQueryOptions = {}): ListQueryState {
  const { defaultSort = DEFAULT_SORT, pageSize = 25, debounceMs = 200 } = options;

  const [search, setSearchRaw] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(
    options.initialFilters ?? options.filters ?? {},
  );
  const [sort, setSortRaw] = useState(defaultSort);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (search === debouncedSearch) return;
    const timer = window.setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => window.clearTimeout(timer);
  }, [search, debouncedSearch, debounceMs]);

  // Narrowing the result set while on page 7 shows an empty screen and reads as
  // a bug, so any change to what is being asked for returns to page 1.
  const setSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setPage(1);
  }, []);

  const setFilter = useCallback((field: string, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  const setSort = useCallback((next: { field: string; dir: SortDirection }) => {
    setSortRaw(next);
    setPage(1);
  }, []);

  // Serialized so the memo depends on filter *contents*, not on the object
  // identity that setState always replaces.
  const filterKey = JSON.stringify(filters);

  const query = useMemo<ListQuery>(
    () => ({
      search: debouncedSearch.trim() || undefined,
      filters: JSON.parse(filterKey) as Record<string, string>,
      sort,
      page,
      pageSize,
    }),
    [debouncedSearch, filterKey, sort, page, pageSize],
  );

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return {
    query,
    search,
    setSearch,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
  };
}
