import type { NormalizedMessage } from './types'

// Postgres text columns are UTF-8 and reject null bytes and invalid byte
// sequences (error 22021). Inbound email is a wild-west of encodings, so every
// text field is scrubbed here BEFORE it can reach Prisma.

// Sensible per-field caps (Postgres `text` is unbounded, but we cap defensively
// to avoid absurd payloads / future varchar columns).
export const FIELD_CAPS = {
  fromAddr: 320,   // RFC 5321 max email length
  fromName: 320,
  subject: 998,    // RFC 5322 line length
  snippet: 500,
  bodyText: 500_000,
} as const

/**
 * Make an arbitrary string safe to store in a Postgres text column:
 *  - drop null bytes (the direct 22021 trigger),
 *  - drop other C0/C1 control chars except tab, newline, carriage-return,
 *  - drop lone/unpaired UTF-16 surrogates (they can't encode to valid UTF-8),
 *  - trim to `maxLen`.
 * Valid multi-byte content (emoji, non-Latin scripts) is preserved.
 */
export function sanitizeText(input: unknown, maxLen = 100_000): string {
  if (input == null) return ''
  return finish(String(input), maxLen)
}

// Scrubbing uses RegExp built from code-point strings, so the source file stays
// plain ASCII (no embedded control bytes).
const NULL_AND_CONTROL = new RegExp(
  '[' +
    '\\u0000-\\u0008' + // C0 controls except tab(09) LF(0A) CR(0D)
    '\\u000B\\u000C' +
    '\\u000E-\\u001F' +
    '\\u007F-\\u009F' + // DEL + C1 controls
  ']',
  'g',
)
// A high surrogate NOT followed by a low surrogate (lone high).
const LONE_HIGH_SURROGATE = new RegExp('[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])', 'g')
// A low surrogate NOT preceded by a high surrogate (lone low). Lookbehind is
// zero-width, so consecutive lone lows are all removed while valid emoji pairs
// (high+low) are preserved.
const LONE_LOW_SURROGATE = new RegExp('(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]', 'g')

function finish(input: string, maxLen: number): string {
  let s = input
    .replace(NULL_AND_CONTROL, '')
    .replace(LONE_HIGH_SURROGATE, '')
    .replace(LONE_LOW_SURROGATE, '')
  if (s.length > maxLen) s = s.slice(0, maxLen)
  return s
}

/** Sanitize every text field of a normalized message so it's safe to persist. */
export function sanitizeMessage(m: NormalizedMessage): NormalizedMessage {
  const fromName = m.fromName != null ? sanitizeText(m.fromName, FIELD_CAPS.fromName) : undefined
  return {
    ...m,
    fromAddr: sanitizeText(m.fromAddr, FIELD_CAPS.fromAddr),
    fromName: fromName || undefined,
    subject: sanitizeText(m.subject, FIELD_CAPS.subject) || '(no subject)',
    snippet: sanitizeText(m.snippet, FIELD_CAPS.snippet),
    bodyText: sanitizeText(m.bodyText, FIELD_CAPS.bodyText),
  }
}
