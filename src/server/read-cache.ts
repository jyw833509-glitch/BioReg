// Bounded per-runtime cache. Failed reads are never cached or served as stale data.
export function createReadCache(
  maxEntries = 64,
  ttlMs = 30000,
  now = Date.now,
) {
  type Entry = { promise: Promise<unknown>; expires: number; pending: boolean };
  const entries = new Map<string, Entry>();
  return {
    async read<T>(key: string, load: () => Promise<T>): Promise<T> {
      const existing = entries.get(key);
      if (existing && (existing.pending || existing.expires > now())) {
        entries.delete(key);
        entries.set(key, existing);
        return existing.promise as Promise<T>;
      }
      entries.delete(key);
      const entry: Entry = {
        promise: Promise.resolve(),
        expires: 0,
        pending: true,
      };
      entry.promise = Promise.resolve()
        .then(load)
        .then(
          (value) => {
            entry.pending = false;
            entry.expires = now() + ttlMs;
            return value;
          },
          (error) => {
            if (entries.get(key) === entry) entries.delete(key);
            throw error;
          },
        );
      entries.set(key, entry);
      while (entries.size > maxEntries)
        entries.delete(entries.keys().next().value!);
      return entry.promise as Promise<T>;
    },
  };
}
