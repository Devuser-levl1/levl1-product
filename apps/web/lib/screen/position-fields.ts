// ── Position setup option lists (Screen-scoped, isomorphic) ────────────────
// Extend by adding to these arrays. Both fields also accept free text ("Other").

export const DEPARTMENTS = [
  'Engineering', 'Product', 'Data & Analytics', 'Design', 'QA & Testing', 'DevOps & Infrastructure', 'IT & Support',
  'Security', 'Sales', 'Marketing', 'Customer Success', 'HR & Talent', 'Finance & Accounting', 'Operations',
  'Legal & Compliance', 'Supply Chain', 'Administration',
] as const

export const INDUSTRIES = [
  'Banking', 'Insurance', 'Fintech & Payments', 'Capital Markets', 'Healthcare', 'Pharma & Life Sciences',
  'Retail & E-commerce', 'Consumer Goods (FMCG)', 'Manufacturing', 'Automotive', 'Telecom', 'Energy & Utilities',
  'Logistics & Supply Chain', 'Travel & Hospitality', 'Media & Entertainment', 'Gaming', 'Education & Edtech',
  'Government & Public Sector', 'Real Estate & Construction', 'SaaS / Enterprise Software', 'IT Services & Consulting',
] as const

/** One stored string (Position.domainContext) from the dropdown + optional details. */
export function composeDomain(industry: string, details: string): string {
  const i = industry.trim(), d = details.trim()
  return i && d ? `${i} — ${d}` : i || d
}

/** Split a stored domainContext back into dropdown + details (legacy free values become details). */
export function splitDomain(stored: string | null | undefined): { industry: string; details: string } {
  const s = (stored ?? '').trim()
  if (!s) return { industry: '', details: '' }
  const [head, ...rest] = s.split(' — ')
  return (INDUSTRIES as readonly string[]).includes(head) ? { industry: head, details: rest.join(' — ') } : { industry: '', details: s }
}
