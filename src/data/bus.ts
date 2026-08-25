/* A tiny change bus.
 *
 * Repositories announce writes; repo-backed hooks refetch. This is what keeps
 * data out of Zustand (CONTEXT.md §2 rule 4) — the UI holds no server-shaped
 * cache of its own, it just re-asks the provider when something changed.
 *
 * Every adapter is expected to emit here, not just the mock one: a REST adapter
 * emits after a successful mutation, a websocket adapter emits on push.
 */

export type ResourceKey =
  | 'contacts'
  | 'companies'
  | 'deals'
  | 'tasks'
  | 'notes'
  | 'users'
  | 'activity'
  | 'settings';

type Listener = (keys: ReadonlySet<ResourceKey>) => void;

const listeners = new Set<Listener>();

export function subscribeToChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitChange(...keys: ResourceKey[]): void {
  if (keys.length === 0) return;
  const set = new Set(keys);
  // Copy first: a listener may unsubscribe during iteration.
  for (const listener of [...listeners]) listener(set);
}
