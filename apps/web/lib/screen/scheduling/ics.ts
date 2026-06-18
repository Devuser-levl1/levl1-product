// ── .ics calendar file generation (Screen-scoped, no dependency) ───────────
// Produces a standards-compliant VEVENT the candidate can add to ANY calendar.
// Times are emitted as UTC (Z) so they're correct in every timezone — no
// VTIMEZONE block needed.

export interface IcsEvent {
  uid: string
  start: Date
  end: Date
  title: string
  description?: string
  location?: string      // e.g. the join URL
  organizerName?: string
  organizerEmail?: string
  attendeeEmail?: string
  method?: 'REQUEST' | 'CANCEL'
  sequence?: number      // bump on reschedule/cancel so calendars update
}

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}
function esc(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}
// Fold long lines to 75 octets per RFC 5545.
function fold(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  let s = line
  while (s.length > 75) { parts.push(parts.length ? ' ' + s.slice(0, 74) : s.slice(0, 75)); s = s.slice(parts.length ? 74 : 75) }
  parts.push(' ' + s)
  return parts.join('\r\n')
}

export function buildIcs(ev: IcsEvent): string {
  const method = ev.method ?? 'REQUEST'
  const status = method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Levl1//Screen//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${esc(ev.uid)}`,
    `SEQUENCE:${ev.sequence ?? 0}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(ev.start)}`,
    `DTEND:${fmt(ev.end)}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : '',
    ev.location ? `LOCATION:${esc(ev.location)}` : '',
    ev.organizerEmail ? `ORGANIZER;CN=${esc(ev.organizerName ?? 'Levl1')}:mailto:${ev.organizerEmail}` : '',
    ev.attendeeEmail ? `ATTENDEE;CN=${esc(ev.attendeeEmail)};RSVP=TRUE:mailto:${ev.attendeeEmail}` : '',
    `STATUS:${status}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).map(fold)
  return lines.join('\r\n')
}

// Resend attachment (base64 content).
export function icsAttachment(ics: string, filename = 'interview.ics') {
  return { filename, content: Buffer.from(ics, 'utf8').toString('base64'), contentType: 'text/calendar; method=REQUEST' }
}
