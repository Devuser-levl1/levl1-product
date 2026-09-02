// Pure nurture constants (no server deps) — safe to import from client
// components. lib/hire/nurture.ts re-exports these for server use.

export const DEFAULT_NURTURE_INTERVALS = [15, 30, 45, 60, 90]

export type NurtureResponse = 'all_good' | 'issues' | 'left'
export interface ResponseOption { key: NurtureResponse; label: string; short: string; flagged: boolean }

export const NURTURE_RESPONSES: ResponseOption[] = [
  { key: 'all_good', label: 'All good / Still working', short: 'All good', flagged: false },
  { key: 'issues', label: 'Facing some issues', short: 'Facing issues', flagged: true },
  { key: 'left', label: 'No longer working there', short: 'No longer there', flagged: true },
]

export const RESPONSE_BY_KEY = new Map(NURTURE_RESPONSES.map((r) => [r.key, r]))

export function isFlagged(r: string | null | undefined): boolean {
  return r === 'issues' || r === 'left'
}

/** Normalize a configured interval list (fallback to the default set). */
export function resolveIntervals(raw: unknown): number[] {
  const list = Array.isArray(raw) ? raw.map((n) => Math.round(Number(n))).filter((n) => Number.isFinite(n) && n > 0 && n <= 365) : []
  const uniq = Array.from(new Set(list)).sort((a, b) => a - b)
  return uniq.length ? uniq : [...DEFAULT_NURTURE_INTERVALS]
}
