/**
 * Interview slot generation — next weekdays at fixed IST hours.
 *
 * Slots are absolute instants (Date). Labels are rendered in Asia/Kolkata so
 * the candidate always sees IST regardless of server timezone (Render = UTC).
 */

const IST_HOURS = [10, 11, 14, 15, 16] // 10am, 11am, 2pm, 3pm, 4pm IST
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function generateAvailableSlots(count = 5): Date[] {
  const slots: Date[] = []
  const now = new Date()

  for (let day = 1; day <= 21 && slots.length < count; day++) {
    const base = new Date(now.getTime())
    base.setUTCDate(now.getUTCDate() + day)

    // Compute the calendar date *in IST* for this day
    const ist = new Date(base.getTime() + IST_OFFSET_MS)
    const weekday = ist.getUTCDay()
    if (weekday === 0 || weekday === 6) continue // skip Sat/Sun (IST)

    const y = ist.getUTCFullYear()
    const m = ist.getUTCMonth()
    const d = ist.getUTCDate()

    for (const hour of IST_HOURS) {
      if (slots.length >= count) break
      // IST hour → UTC instant
      const utcMs = Date.UTC(y, m, d, hour, 0, 0) - IST_OFFSET_MS
      const slot = new Date(utcMs)
      if (slot.getTime() <= now.getTime()) continue
      slots.push(slot)
    }
  }

  return slots
}

export function formatSlotLabel(date: Date): string {
  const day = date.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
  })
  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
  return `${day} at ${time} IST`
}
