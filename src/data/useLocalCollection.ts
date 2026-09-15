import { useCallback, useEffect, useMemo, useState } from 'react';
import { Collection, generateId } from './mock/collection';
import type { ID, ListQuery, SortDirection } from './types';

// In-memory registry to ensure multiple hooks for the same collection share one instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, Collection<any>>();
const listeners = new Map<string, Set<() => void>>();

function notify(name: string) {
  listeners.get(name)?.forEach((cb) => cb());
}

export function getOrCreateCollection<T extends { id: ID }>(
  name: string,
  initial: T[],
  searchFields?: (keyof T)[],
  defaultSort?: { field: string; dir: SortDirection },
): Collection<T> {
  if (!registry.has(name)) {
    registry.set(
      name,
      new Collection<T>({
        name: `crm_col_${name}`,
        initial,
        searchFields,
        defaultSort,
      }),
    );
  }
  return registry.get(name) as Collection<T>;
}

export interface UseLocalCollectionOptions<T> {
  searchFields?: (keyof T)[];
  defaultSort?: { field: string; dir: SortDirection };
  pageSize?: number;
}

export interface UseLocalCollectionConfig<T extends { id: ID }> {
  collectionKey?: string;
  name?: string;
  initialData?: T[];
  searchFields?: (keyof T)[];
  defaultSort?: { field: string; dir: SortDirection };
  pageSize?: number;
}

export function useLocalCollection<T extends { id: ID }>(
  nameOrConfig: string | UseLocalCollectionConfig<T>,
  initialDataArg?: T[],
  optionsArg?: UseLocalCollectionOptions<T>,
) {
  const isObject = typeof nameOrConfig !== 'string';
  const config = isObject ? nameOrConfig : undefined;

  const name = isObject
    ? (config?.collectionKey ?? config?.name ?? 'collection')
    : nameOrConfig;
  const initialData = useMemo(() => {
    return isObject ? (config?.initialData ?? []) : (initialDataArg ?? []);
  }, [isObject, config?.initialData, initialDataArg]);

  const searchFields = isObject ? config?.searchFields : optionsArg?.searchFields;
  const defaultSort = isObject ? config?.defaultSort : optionsArg?.defaultSort;
  const pageSize = (isObject ? config?.pageSize : optionsArg?.pageSize) ?? 20;

  const collection = useMemo(
    () => getOrCreateCollection<T>(name, initialData, searchFields, defaultSort),
    [name, initialData, searchFields, defaultSort],
  );

  const [search, setSearch] = useState('');
  const [filters, setFiltersState] = useState<Record<string, unknown>>({});
  const [sort, setSort] = useState<{ field: string; dir: SortDirection } | undefined>(defaultSort);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);

  // Subscribe to changes from any instance editing this collection
  useEffect(() => {
    if (!listeners.has(name)) {
      listeners.set(name, new Set());
    }
    const set = listeners.get(name)!;
    const onChange = () => setRevision((r) => r + 1);
    set.add(onChange);
    return () => {
      set.delete(onChange);
    };
  }, [name]);

  const queryResult = useMemo(() => {
    // Reference revision to re-run query when collection changes
    void revision;
    const query: ListQuery = {
      search,
      filters,
      sort,
      page,
      pageSize,
    };
    return collection.query(query);
  }, [collection, search, filters, sort, page, pageSize, revision]);

  const allItems = useMemo(() => {
    void revision;
    return collection.snapshot();
  }, [collection, revision]);

  const setFilter = useCallback((field: string, value: unknown) => {
    setFiltersState((prev) => {
      const next = { ...prev };
      if (value === undefined || value === null || value === '') {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((v) => v !== undefined && v !== null && v !== '').length;
  }, [filters]);

  const createItem = useCallback(
    (input: Partial<T> & Record<string, unknown>): T => {
      const id = (input.id as ID) ?? generateId(name.slice(0, 4));
      const now = new Date().toISOString();
      const newItem = {
        createdAt: now,
        updatedAt: now,
        ...input,
        id,
      } as unknown as T;
      const created = collection.insert(newItem);
      notify(name);
      return created;
    },
    [collection, name],
  );

  const updateItem = useCallback(
    (id: ID, patch: Partial<T>): T | null => {
      const updated = collection.patch(id, patch);
      if (updated) notify(name);
      return updated;
    },
    [collection, name],
  );

  const deleteItem = useCallback(
    (id: ID): boolean => {
      const before = collection.snapshot();
      const filtered = before.filter((item) => item.id !== id);
      if (filtered.length === before.length) return false;
      collection.replaceAll(filtered);
      notify(name);
      return true;
    },
    [collection, name],
  );

  const getItem = useCallback(
    (id: ID): T | null => {
      return collection.find(id);
    },
    [collection],
  );

  const resetToInitial = useCallback(() => {
    collection.replaceAll(initialData);
    notify(name);
  }, [collection, initialData, name]);

  return {
    items: queryResult.items,
    data: queryResult.items,
    total: queryResult.total,
    page: queryResult.page,
    pageSize: queryResult.pageSize,
    allItems,
    search,
    setSearch: (s: string) => {
      setSearch(s);
      setPage(1);
    },
    filters,
    setFilter,
    setFilters: (f: Record<string, unknown>) => {
      setFiltersState(f);
      setPage(1);
    },
    clearFilters,
    activeFilterCount,
    sort,
    setSort,
    setPage,
    createItem,
    create: createItem,
    insert: createItem,
    updateItem,
    update: updateItem,
    patch: updateItem,
    deleteItem,
    remove: deleteItem,
    delete: deleteItem,
    getItem,
    find: getItem,
    resetToInitial,
  };
}
