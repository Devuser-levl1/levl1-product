// Client-safe deal-economics math (no server imports). Used by the API to store
// `value` and by the deal editor to recalculate live.

export interface DealEconomics {
  positions?: number | null
  billRate?: number | null
  hoursPerWeek?: number | null
  durationValue?: number | null
  durationUnit?: string | null // 'weeks' | 'months'
  margin?: number | null
}

// Average weeks per month = 52/12 ≈ 4.333, so 6 months → 26 weeks.
const WEEKS_PER_MONTH = 52 / 12

export function durationToWeeks(value?: number | null, unit?: string | null): number {
  const v = Number(value) || 0
  return unit === 'months' ? v * WEEKS_PER_MONTH : v
}

/** Does the deal have enough structured inputs to auto-compute its size? */
export function hasEconomics(e: DealEconomics): boolean {
  return [e.positions, e.billRate, e.hoursPerWeek, e.durationValue].some((v) => v != null && Number(v) > 0)
}

/**
 * Deal size = positions × billRate × hoursPerWeek × weeks(duration).
 * Example: 4 × $30 × 40 × 26 = $124,800.
 */
export function computeDealSize(e: DealEconomics): number {
  const positions = Number(e.positions) || 0
  const billRate = Number(e.billRate) || 0
  const hoursPerWeek = Number(e.hoursPerWeek) || 0
  const weeks = durationToWeeks(e.durationValue, e.durationUnit)
  return Math.round(positions * billRate * hoursPerWeek * weeks)
}

/** Optional gross-margin amount derived from the margin % (display only). */
export function computeMarginAmount(value: number, margin?: number | null): number | null {
  if (margin == null || isNaN(Number(margin))) return null
  return Math.round((value * Number(margin)) / 100)
}

/** A transparent line-by-line breakdown for the UI. */
export function dealBreakdown(e: DealEconomics): { weeks: number; value: number; marginAmount: number | null } {
  const weeks = Math.round(durationToWeeks(e.durationValue, e.durationUnit) * 10) / 10
  const value = computeDealSize(e)
  return { weeks, value, marginAmount: computeMarginAmount(value, e.margin) }
}
