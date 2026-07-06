const inflight = new Map<string, Promise<unknown>>();

/**
 * Deduplicate concurrent identical async work (e.g. same Supabase query).
 */
export function dedupeRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = factory().finally(() => {
    if (inflight.get(key) === promise) {
      inflight.delete(key);
    }
  });

  inflight.set(key, promise);
  return promise;
}
