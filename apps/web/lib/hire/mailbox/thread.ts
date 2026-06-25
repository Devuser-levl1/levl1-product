// Client-safe conversation-threading helpers. v1 groups by normalized subject +
// correspondent (the sender). Upgrade to RFC In-Reply-To/References later.

/** Strip Re:/Fwd:/Fw: prefixes (repeatedly), collapse whitespace, lowercase. */
export function normalizeSubject(subject: string): string {
  let s = (subject || '').trim()
  let prev = ''
  while (s !== prev) { prev = s; s = s.replace(/^\s*(re|fwd|fw)\s*:\s*/i, '') }
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Thread key = normalized subject + correspondent email (lowercased). */
export function threadKey(subject: string, fromAddr: string): string {
  return `${normalizeSubject(subject)}|${(fromAddr || '').trim().toLowerCase()}`
}
