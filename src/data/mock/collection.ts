import type { ID, ListQuery, Page } from '../types';
import { readJSON, writeJSON } from './storage';

/* A generic persisted collection with the query engine every repository shares.
 *
 * Search/filter/sort/paginate live here once, so the eight repositories stay
 * thin and behave identically — which is exactly the behaviour a real backend
 * will have to reproduce when it replaces this file.
 */

export interface CollectionOptions<T> {
  /** Storage key, also the resource name. */
  name: string;
  /** Fields that free-text search scans. */
  searchFields?: (keyof T)[];
  /** Applied when no sort is requested. */
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
  /** Values used when the store is empty on first boot. */
  initial?: T[];
}

export const DEFAULT_PAGE_SIZE = 25;

let idCounter = 0;

/** Sortable, collision-free enough for a single-browser mock. */
export function generateId(prefix = 'id'): string {
  idCounter += 1;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${idCounter.toString(36)}${rand}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

/**
 * Every whitespace-separated token must match at least one searched field.
 * That is what makes "ada love" find Ada Lovelace without the collection
 * needing to know that firstName and lastName form a name.
 */
function matchesSearch<T>(item: T, term: string, fields: (keyof T)[]): boolean {
  const tokens = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = fields
    .map((field) => {
      const value = item[field];
      if (value == null) return '';
      return Array.isArray(value) ? value.join(' ') : String(value);
    })
    .join(' ')
    .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
}

/**
 * Filter semantics, kept small and predictable:
 *   undefined | null | ''      -> ignored (an empty filter control is not a filter)
 *   array                      -> "any of" (empty array also ignored)
 *   scalar vs array field      -> array contains scalar (tags)
 *   scalar vs scalar field     -> strict equality
 */
function matchesFilters<T>(item: T, filters: Record<string, unknown>): boolean {
  return Object.entries(filters).every(([field, expected]) => {
    if (expected === undefined || expected === null || expected === '') return true;
    if (Array.isArray(expected) && expected.length === 0) return true;

    const actual = getPath(item, field);

    if (Array.isArray(expected)) {
      if (Array.isArray(actual)) return expected.some((e) => actual.includes(e));
      return expected.includes(actual);
    }
    if (Array.isArray(actual)) return actual.includes(expected);
    return actual === expected;
  });
}

function compare(a: unknown, b: unknown): number {
  // Undefined sorts last regardless of direction: "no close date" is not "the
  // earliest close date".
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), 'en', { sensitivity: 'base', numeric: true });
}

export class Collection<T extends { id: ID }> {
  readonly name: string;
  private items: T[];
  private readonly searchFields: (keyof T)[];
  private readonly defaultSort?: { field: string; dir: 'asc' | 'desc' };

  constructor(options: CollectionOptions<T>) {
    this.name = options.name;
    this.searchFields = options.searchFields ?? [];
    this.defaultSort = options.defaultSort;
    const stored = readJSON<T[] | null>(options.name, null);
    this.items = stored ?? options.initial ?? [];
    if (!stored && options.initial?.length) this.persist();
  }

  private persist(): void {
    writeJSON(this.name, this.items);
  }

  /** Raw access for repositories that need to compute across the whole set. */
  snapshot(): T[] {
    return this.items.map((item) => ({ ...item }));
  }

  replaceAll(items: T[]): void {
    this.items = items.map((item) => ({ ...item }));
    this.persist();
  }

  clear(): void {
    this.replaceAll([]);
  }

  query(query: ListQuery = {}): Page<T> {
    const { search = '', filters = {}, sort = this.defaultSort, page = 1, pageSize } = query;

    let result = this.items.filter(
      (item) => matchesSearch(item, search, this.searchFields) && matchesFilters(item, filters),
    );

    if (sort) {
      const dir = sort.dir === 'desc' ? -1 : 1;
      result = [...result].sort(
        (a, b) => compare(getPath(a, sort.field), getPath(b, sort.field)) * dir,
      );
    }

    const total = result.length;
    // pageSize <= 0 means "everything" — the Kanban board and charts want the
    // whole set, and should not have to guess a large number.
    const size = pageSize === undefined ? DEFAULT_PAGE_SIZE : pageSize;
    if (size <= 0) {
      return { items: result.map((i) => ({ ...i })), total, page: 1, pageSize: total };
    }

    const lastPage = Math.max(1, Math.ceil(total / size));
    const current = Math.min(Math.max(1, page), lastPage);
    const start = (current - 1) * size;

    return {
      items: result.slice(start, start + size).map((i) => ({ ...i })),
      total,
      page: current,
      pageSize: size,
    };
  }

  find(id: ID): T | null {
    const found = this.items.find((item) => item.id === id);
    return found ? { ...found } : null;
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate).map((item) => ({ ...item }));
  }

  insert(item: T): T {
    this.items = [...this.items, item];
    this.persist();
    return { ...item };
  }

  patch(id: ID, changes: Partial<T>): T | null {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    // id is restored last: a patch can never rewrite an identity. The cast is
    // needed because TS cannot prove `T & Partial<T>` is `T` for a type param.
    const updated = { ...this.items[index], ...changes, id } as T;
    this.items = [...this.items.slice(0, index), updated, ...this.items.slice(index + 1)];
    this.persist();
    return { ...updated };
  }

  /** Bulk in-place edit; used by the integrity rules to null out dead links. */
  patchWhere(predicate: (item: T) => boolean, changes: (item: T) => Partial<T>): number {
    let count = 0;
    this.items = this.items.map((item) => {
      if (!predicate(item)) return item;
      count += 1;
      return { ...item, ...changes(item), id: item.id } as T;
    });
    if (count) this.persist();
    return count;
  }

  remove(id: ID): boolean {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    const removed = this.items.length !== before;
    if (removed) this.persist();
    return removed;
  }

  removeWhere(predicate: (item: T) => boolean): number {
    const before = this.items.length;
    this.items = this.items.filter((item) => !predicate(item));
    const removed = before - this.items.length;
    if (removed) this.persist();
    return removed;
  }
}
