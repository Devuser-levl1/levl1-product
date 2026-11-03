// ── Public base URL for links we send out (emails, WhatsApp, ICS, redirects) ─
// One source of truth for Screen. NEXT_PUBLIC_APP_URL wins when set; an unset
// OR empty value falls back to the live domain. The old per-route fallback was
// 'https://levl1.app', which doesn't resolve — every emailed link built with it
// was dead whenever the env var was missing from the build.
export const DEFAULT_APP_URL = 'https://levl1.io'

export function appUrl(): string {
  const v = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '')
  return /^https?:\/\//i.test(v) ? v : DEFAULT_APP_URL
}
