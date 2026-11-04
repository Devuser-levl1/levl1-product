/**
 * Interview slot helpers (legacy entry points). Generation is config-driven —
 * see lib/screen/scheduling/config.ts (SCREEN_SLOT_* / SCREEN_SLOT_LEAD_MIN).
 *
 * Slots are absolute instants (Date). Labels are rendered in Asia/Kolkata so
 * the candidate always sees IST regardless of server timezone (Render = UTC).
 */

import { generateSlots } from '@/lib/screen/scheduling/slots'

// Delegates to the config-driven generator (lib/screen/scheduling) so every
// surface offers the same slots: today onward, past/lead-time excluded. The old
// fixed-hour version started TOMORROW, which pushed the first slot ~2 days out.
export function generateAvailableSlots(count = 5): Date[] {
  return generateSlots().slice(0, count)
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
