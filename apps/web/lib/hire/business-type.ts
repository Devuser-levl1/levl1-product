// Business-type gating — single source of truth for which surfaces are
// agency-only. ENTERPRISE tenants (in-house HR) do NOT get CRM, Receivables,
// or candidate nurturing (Campaigns); AGENCY tenants see everything.
//
// Used in three places so nav, API middleware, and the page-level guard never
// drift: the sidebar (hide nav), withHireAuth (gate APIs, incl. direct calls),
// and the app layout (redirect a direct-URL visit).

export type BusinessType = 'AGENCY' | 'ENTERPRISE'

// Page path prefixes hidden/blocked for ENTERPRISE. Receivables lives under
// /hire/crm/ar, so the /hire/crm prefix already covers it.
export const AGENCY_ONLY_PAGE_PREFIXES = ['/hire/crm', '/hire/campaigns', '/hire/nurture'] as const

// API path prefixes blocked for ENTERPRISE (all methods, so direct GETs are
// blocked too — not just the UI).
// NOTE: /api/hire/nurture/respond is intentionally NOT gated here — it's the
// public, token-authenticated candidate response endpoint (the candidate isn't
// logged in). It doesn't use withHireAuth, so the business-type gate never runs
// on it; every other /api/hire/nurture route is authed + agency-gated.
export const AGENCY_ONLY_API_PREFIXES = ['/api/hire/crm', '/api/hire/campaigns', '/api/hire/nurture'] as const

function hasPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(p + '/'))
}

/** Is this Hire app page agency-only (blocked for ENTERPRISE)? */
export function isAgencyOnlyPage(pathname: string): boolean {
  return hasPrefix(pathname, AGENCY_ONLY_PAGE_PREFIXES)
}

/** Is this Hire API path agency-only (blocked for ENTERPRISE)? */
export function isAgencyOnlyApi(pathname: string): boolean {
  return hasPrefix(pathname, AGENCY_ONLY_API_PREFIXES)
}
