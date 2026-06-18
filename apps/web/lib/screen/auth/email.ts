// ── Email policy (Screen-scoped auth) ──────────────────────────────────────
// One place for email NORMALIZATION (fixes the duplicate-account bug) and the
// business-email-only BLOCKLIST. Editable config — add domains to FREE_EMAIL_
// DOMAINS as needed. Used by signup, OTP request, and invite-accept so policy
// is enforced consistently on every entry path.

// Always normalize before storing/comparing — case + whitespace variants were
// slipping past the case-sensitive unique index and creating duplicate users.
export function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

// Free / personal providers blocked at every entry path. Editable config.
export const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'aol.com', 'gmx.com', 'gmx.net', 'mail.com', 'mail.ru',
  'yandex.com', 'yandex.ru', 'zoho.com',
  'rediffmail.com', 'rediff.com',
  'fastmail.com', 'hey.com', 'tutanota.com', 'tuta.io',
  'qq.com', '163.com', '126.com',
])

export function emailDomain(email: string): string {
  const n = normalizeEmail(email)
  const at = n.lastIndexOf('@')
  return at >= 0 ? n.slice(at + 1) : ''
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isBusinessEmail(email: string): boolean {
  const n = normalizeEmail(email)
  if (!EMAIL_RE.test(n)) return false
  return !FREE_EMAIL_DOMAINS.has(emailDomain(n))
}

// Returns an error message string when the email is not an acceptable business
// email, or null when it's fine. (Clear, user-facing copy.)
export function businessEmailError(email: string): string | null {
  const n = normalizeEmail(email)
  if (!EMAIL_RE.test(n)) return 'Enter a valid email address.'
  if (FREE_EMAIL_DOMAINS.has(emailDomain(n))) return 'Please use your work email — personal email providers (Gmail, Outlook, etc.) aren\'t allowed.'
  return null
}
