import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToChanges, type ResourceKey } from './bus';
import { useData } from './DataProvider';
import type { DataProvider } from './repositories';

/* The one way UI code reads data.
 *
 * Deliberately small — this is not a query library. It gives every module the
 * same four-state shape (loading / error / data / refresh), refetches when a
 * watched resource changes, and drops responses from superseded requests so a
 * fast typist cannot get a stale list. Anything more (retries, dedup, suspense)
 * belongs to whatever real query layer a fork brings with it.
 */

export interface ResourceState<T> {
  data: T | undefined;
  error: Error | null;
  /** True only on the first load; refetches keep the previous data visible. */
  loading: boolean;
  /** True while any fetch is in flight, including background refetches. */
  fetching: boolean;
  refresh: () => void;
}

export interface UseResourceOptions {
  /** Refetch when these resources are written. */
  watch?: ResourceKey[];
  /** Skip fetching entirely (e.g. an id is not known yet). */
  enabled?: boolean;
}

export function useResource<T>(
  loader: (provider: DataProvider) => Promise<T>,
  deps: readonly unknown[],
  options: UseResourceOptions = {},
): ResourceState<T> {
  const provider = useData();
  const { watch, enabled = true } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [fetching, setFetching] = useState(enabled);
  const [loaded, setLoaded] = useState(false);

  // Keep the latest loader without making it a dependency: callers pass inline
  // arrow functions, which would otherwise refetch on every render.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const requestId = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(() => {
    if (!enabled) return;
    const id = ++requestId.current;
    setFetching(true);
    loaderRef
      .current(provider)
      .then((result) => {
        if (!mounted.current || id !== requestId.current) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!mounted.current || id !== requestId.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!mounted.current || id !== requestId.current) return;
        setFetching(false);
        setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, enabled, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  const watchKey = watch?.join(',') ?? '';
  useEffect(() => {
    if (!watchKey || !enabled) return;
    const keys = watchKey.split(',') as ResourceKey[];
    return subscribeToChanges((changed) => {
      if (keys.some((key) => changed.has(key))) run();
    });
  }, [watchKey, enabled, run]);

  return { data, error, loading: !loaded && fetching, fetching, refresh: run };
}

/**
 * Mutations do not go through useResource — call the repository directly and
 * let the change bus refresh whatever is watching. This wrapper only
 * standardizes the pending/error bookkeeping around that call.
 */
export function useMutation<TArgs extends unknown[], TResult>(
  mutate: (provider: DataProvider, ...args: TArgs) => Promise<TResult>,
): {
  run: (...args: TArgs) => Promise<TResult>;
  pending: boolean;
  error: Error | null;
  reset: () => void;
} {
  const provider = useData();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  const run = useCallback(
    async (...args: TArgs) => {
      setPending(true);
      setError(null);
      try {
        return await mutateRef.current(provider, ...args);
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        setError(normalized);
        throw normalized;
      } finally {
        setPending(false);
      }
    },
    [provider],
  );

  const reset = useCallback(() => setError(null), []);
  return { run, pending, error, reset };
}
