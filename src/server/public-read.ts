import { createReadCache } from "./read-cache";
import { officialOnly } from "./visibility";
const shared = globalThis as unknown as {
  bioregPublicReadsV1?: ReturnType<typeof createReadCache>;
};
const cache = (shared.bioregPublicReadsV1 ??= createReadCache());
// Only explicitly public, read-only callers use this. Auth, mutable workspace
// state, reports/evidence exports and live health checks always bypass it.
export function publicRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!officialOnly() || process.env.BIOREG_DISABLE_READ_CACHE === "true")
    return load();
  return cache.read(new Date().toISOString().slice(0, 10) + ":" + key, load);
}
