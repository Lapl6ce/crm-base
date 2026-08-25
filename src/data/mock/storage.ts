/* Namespaced, versioned localStorage with an in-memory fallback.
 *
 * The fallback matters: private-mode Safari throws on setItem, and any SSR or
 * test run has no window at all. The app must degrade to a working session that
 * simply does not survive reload, never to a crash.
 */

const NAMESPACE = 'crm-base';
export const SCHEMA_VERSION = 1;

const memory = new Map<string, string>();

let backend: Storage | null | undefined;

function getBackend(): Storage | null {
  if (backend !== undefined) return backend;
  try {
    const probe = '__crm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    backend = window.localStorage;
  } catch {
    backend = null;
  }
  return backend;
}

const key = (name: string) => `${NAMESPACE}:v${SCHEMA_VERSION}:${name}`;

export function readJSON<T>(name: string, fallback: T): T {
  const store = getBackend();
  const raw = store ? store.getItem(key(name)) : memory.get(key(name));
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt entry — treat as absent rather than taking the app down.
    return fallback;
  }
}

export function writeJSON(name: string, value: unknown): void {
  const serialized = JSON.stringify(value);
  const store = getBackend();
  if (!store) {
    memory.set(key(name), serialized);
    return;
  }
  try {
    store.setItem(key(name), serialized);
  } catch {
    // Quota exceeded: keep the session alive in memory.
    memory.set(key(name), serialized);
  }
}

export function removeKey(name: string): void {
  const store = getBackend();
  memory.delete(key(name));
  store?.removeItem(key(name));
}

/** Drops every key this app owns, including older schema versions. */
export function clearAll(): void {
  memory.clear();
  const store = getBackend();
  if (!store) return;
  const doomed: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const k = store.key(i);
    if (k?.startsWith(`${NAMESPACE}:`)) doomed.push(k);
  }
  doomed.forEach((k) => store.removeItem(k));
}
