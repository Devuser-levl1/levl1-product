import { SLOT_CONFIG, SlotConfig } from './config'

// ── Config-driven fixed daily slot generation (Screen-scoped) ──────────────
// Slots are absolute UTC instants; wall-clock hours are interpreted in the
// configured timezone (DST-correct via Intl, no external dep).

// Offset (ms) of a tz at a given instant: tz-local-as-UTC minus the instant.
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const p = dtf.formatToParts(date).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a }, {})
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +(p.hour === '24' ? '0' : p.hour), +p.minute, +p.second)
  return asUTC - date.getTime()
}

// Convert a wall-clock time in `tz` to the correct UTC instant.
function zonedToUtc(y: number, m: number, d: number, hour: number, minute: number, tz: string): Date {
  const guess = Date.UTC(y, m, d, hour, minute)
  const offset = tzOffsetMs(new Date(guess), tz)
  return new Date(guess - offset)
}

// The calendar Y/M/D *in tz* for an instant `daysAhead` from `from`.
function tzDateParts(from: Date, daysAhead: number, tz: string) {
  const inst = new Date(from.getTime() + daysAhead * 86400000)
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
  const p = dtf.formatToParts(inst).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a }, {})
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { y: +p.year, m: +p.month - 1, d: +p.day, weekday: weekdayMap[p.weekday] }
}

// All bookable slot instants within the horizon (future-only), per config.
export function generateSlots(cfg: SlotConfig = SLOT_CONFIG, from: Date = new Date()): Date[] {
  const out: Date[] = []
  for (let day = 0; day <= cfg.horizonDays; day++) {
    const { y, m, d, weekday } = tzDateParts(from, day, cfg.timezone)
    if (!cfg.workingDays.includes(weekday)) continue
    for (let hh = cfg.startHour * 60; hh < cfg.endHour * 60; hh += cfg.blockMinutes) {
      const slot = zonedToUtc(y, m, d, Math.floor(hh / 60), hh % 60, cfg.timezone)
      if (slot.getTime() > from.getTime() + 60_000) out.push(slot) // future-only, small buffer
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime())
}

// Bookable slots minus those already taken (booked ISO instants).
export function availableSlots(bookedIso: Set<string>, cfg: SlotConfig = SLOT_CONFIG, from: Date = new Date()): Date[] {
  return generateSlots(cfg, from).filter((s) => !bookedIso.has(s.toISOString()))
}

export function formatSlot(date: Date, tz: string = SLOT_CONFIG.timezone): string {
  const day = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz })
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  return `${day} at ${time}`
}
