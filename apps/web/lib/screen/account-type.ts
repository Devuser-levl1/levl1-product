// ── Screen account type (agency vs in-house company) ───────────────────────
// Stored on Agency.accountType. Drives the job-setup form: an AGENCY hires for
// client companies (client name + client contacts); a COMPANY hires for itself
// (no client field — the company is the account; one in-house contact).
//
// Existing accounts have null. They keep the original agency-style form (so
// nothing they rely on disappears) until they answer the one-time prompt.

export type AccountType = 'agency' | 'company'

export const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string }[] = [
  { value: 'agency', label: 'Recruitment agency', desc: 'We hire on behalf of client companies' },
  { value: 'company', label: 'Company / Enterprise', desc: 'We hire for our own team (in-house)' },
]

export function isAccountType(v: unknown): v is AccountType {
  return v === 'agency' || v === 'company'
}

/** What the UI should behave as. null/unknown → 'agency' (legacy behavior). */
export function effectiveAccountType(v: unknown): AccountType {
  return v === 'company' ? 'company' : 'agency'
}
