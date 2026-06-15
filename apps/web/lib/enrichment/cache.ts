// Simple in-memory 24h cache for external lookups (GitHub, company data) so we
// respect upstream rate limits. Per server instance — good enough for phase 1.
const TTL = 24 * 60 * 60 * 1000
const store = new Map<string, { ts: number; value: unknown }>()

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.ts > TTL) { store.delete(key); return undefined }
  return hit.value as T
}

export function cacheSet(key: string, value: unknown): void {
  store.set(key, { ts: Date.now(), value })
}
