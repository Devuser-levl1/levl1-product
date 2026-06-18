// ── Slot scheduling config (Screen-scoped, Build I-P0-1) ───────────────────
// Fixed daily bookable slots — start/end/block-length/working-days/timezone are
// CONFIG, not hardcoded. Override via env without code changes.

export interface SlotConfig {
  startHour: number      // first slot hour (local to `timezone`)
  endHour: number        // last slot starts before this hour
  blockMinutes: number   // slot length
  workingDays: number[]  // 0=Sun … 6=Sat
  timezone: string       // IANA tz the wall-clock hours are expressed in
  horizonDays: number    // how far ahead slots are offered
}

const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d }

export const SLOT_CONFIG: SlotConfig = {
  startHour: num(process.env.SCREEN_SLOT_START_HOUR, 9),
  endHour: num(process.env.SCREEN_SLOT_END_HOUR, 17),
  blockMinutes: num(process.env.SCREEN_SLOT_BLOCK_MIN, 30),
  workingDays: (process.env.SCREEN_SLOT_WORKING_DAYS ?? '1,2,3,4,5').split(',').map((s) => Number(s.trim())).filter((n) => n >= 0 && n <= 6),
  timezone: process.env.SCREEN_SLOT_TZ ?? 'Asia/Kolkata',
  horizonDays: num(process.env.SCREEN_SLOT_HORIZON_DAYS, 14),
}
