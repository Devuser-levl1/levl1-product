import { Captured } from './types'

// scrapeProfile runs IN THE PAGE (injected via chrome.scripting.executeScript
// or as a content script). It MUST be fully self-contained — no imports, no
// references to module-scope helpers — because Chrome serializes the function
// source to run it in the page context.
//
// Compliance: it only reads what is already rendered/visible to the logged-in
// user on the current page. No network calls, no crawling, no auth-wall
// bypassing. One page at a time, user-initiated (the recruiter opened the popup).
export function scrapeProfile(): Captured {
  const text = (el: Element | null | undefined): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const firstText = (sels: string[]): string => {
    for (const s of sels) { const t = text(document.querySelector(s)); if (t) return t }
    return ''
  }
  const meta = (name: string): string => {
    const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)
    return (el?.getAttribute('content') ?? '').trim()
  }

  const isLinkedIn = location.hostname.endsWith('linkedin.com') && location.pathname.startsWith('/in/')
  const isIndeed = location.hostname.endsWith('indeed.com')
  const isNaukri = location.hostname.endsWith('naukri.com')
  const result: Captured = {
    name: '', title: '', company: '', location: '', profileUrl: location.href.split('?')[0],
    email: '', phone: '', source: isLinkedIn ? 'linkedin' : isIndeed ? 'indeed' : isNaukri ? 'naukri' : 'generic',
    capturable: true,
  }

  // ── JSON-LD Person (works on many sites incl. LinkedIn) ──
  try {
    const blocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    for (const b of blocks) {
      const json = JSON.parse(b.textContent || '{}')
      const nodes = Array.isArray(json) ? json : (json['@graph'] ?? [json])
      for (const n of nodes) {
        if (n && (n['@type'] === 'Person' || (Array.isArray(n['@type']) && n['@type'].includes('Person')))) {
          if (!result.name && n.name) result.name = String(n.name)
          if (!result.title && n.jobTitle) result.title = String(n.jobTitle)
          if (!result.company && n.worksFor?.name) result.company = String(n.worksFor.name)
          if (!result.location && (n.address?.addressLocality || n.homeLocation?.name)) result.location = String(n.address?.addressLocality || n.homeLocation?.name)
        }
      }
    }
  } catch { /* ignore malformed JSON-LD */ }

  if (isLinkedIn) {
    if (!result.name) result.name = firstText(['h1.text-heading-xlarge', 'main h1', 'h1'])
    if (!result.title) result.title = firstText(['.text-body-medium.break-words', 'div.text-body-medium'])
    if (!result.location) result.location = firstText(['.text-body-small.inline.t-black--light', 'span.text-body-small.inline'])
    // Current company often appears in the experience/top-card aria-label.
    if (!result.company) {
      const exp = document.querySelector('[aria-label*="Current company"], button[aria-label*="company"]')
      result.company = text(exp)
    }
  }

  if (isIndeed) {
    // Only an INDIVIDUAL candidate profile is capturable — never the search
    // list (whose heading is "Smart Sourcing" and whose only email is the
    // logged-in recruiter's account). Detect page type by URL + DOM.
    const path = location.pathname
    const looksLikeProfile = /\/resume\/[A-Za-z0-9]/.test(path) || /\/candidates?\/[A-Za-z0-9]/.test(path)
    const looksLikeSearch = /\/search/.test(path) || path === '/' || path === ''
    // A real profile renders a dedicated candidate container; a search list does not.
    const profileRoot = document.querySelector(
      '[data-testid="resume"], [data-testid="CandidateProfile"], .rezemp-ResumeDisplay, [class*="ResumeDisplay"], main [data-testid="resume-name"]',
    )
    const isProfile = !!profileRoot || (looksLikeProfile && !looksLikeSearch)

    if (!isProfile) {
      result.capturable = false
      result.notice = 'This looks like the Indeed search/results page. Open a specific candidate’s profile first, then click capture.'
      return result // do NOT scrape list headings or the account email
    }

    // Scope every lookup to the candidate profile container so we never read the
    // page chrome (account menu, nav, "Smart Sourcing" heading).
    const root: ParentNode = profileRoot ?? document
    const scoped = (sels: string[]): string => {
      for (const s of sels) { const t = text(root.querySelector(s)); if (t) return t }
      return ''
    }
    // NOTE: selectors are best-effort until the real profile DOM is confirmed
    // (see the report) — but they are SCOPED to the profile root and never fall
    // back to document.title / og: / a page-wide email scan.
    result.name = scoped(['[data-testid="resume-name"]', '[data-testid="CandidateName"]', 'h1[itemprop="name"]', 'h1'])
    result.title = scoped(['[data-testid="resume-headline"]', '[data-testid="CandidateHeadline"]', '[itemprop="jobTitle"]'])
    result.company = scoped(['[data-testid="work-experience"] [data-testid="company"]', '[data-testid="ExperienceItem-company"]', '[itemprop="worksFor"]'])
    result.location = scoped(['[data-testid="resume-location"]', '[data-testid="CandidateLocation"]', '[itemprop="address"]'])
    // Email/phone on Indeed are usually behind a paid unlock — only take them
    // from an explicit mailto/tel INSIDE the profile; otherwise leave blank.
    const m = root.querySelector('a[href^="mailto:"]'); if (m) result.email = (m.getAttribute('href') || '').replace('mailto:', '').split('?')[0].trim()
    const t = root.querySelector('a[href^="tel:"]'); if (t) result.phone = (t.getAttribute('href') || '').replace('tel:', '').trim()
    return result // Indeed is fully handled here — skip the generic fallbacks
  }

  if (isNaukri) {
    // Naukri Resdex / recruiter candidate-profile view. Selectors are best-effort
    // across Resdex profile layouts; falls through to generic + visible-text
    // extraction below for anything not matched. Experience/skills aren't part of
    // the shared capture shape, so (like LinkedIn/Indeed) only the standard
    // fields are mapped here.
    if (!result.name) result.name = firstText(['.cand-name', '[data-ngp="candidateName"]', '.name', 'header h1', 'main h1', 'h1'])
    if (!result.title) result.title = firstText(['.desig', '.designation', '[data-ngp="designation"]'])
    if (!result.company) result.company = firstText(['.org', '.company', '[data-ngp="organization"]'])
    if (!result.location) result.location = firstText(['.loc', '.location', '[data-ngp="location"]'])
  }

  // Explicit candidate contact links are safe on any source.
  const mailto = document.querySelector('a[href^="mailto:"]')
  if (mailto) result.email = (mailto.getAttribute('href') || '').replace('mailto:', '').split('?')[0].trim()
  const tel = document.querySelector('a[href^="tel:"]')
  if (tel) result.phone = (tel.getAttribute('href') || '').replace('tel:', '').trim()

  // ── Generic fallbacks — ONLY for unknown pages (source 'generic'). Known
  //    boards must NEVER fall back to the page title / og: metadata (grabs the
  //    page heading) or scan the whole page for an email/phone (grabs the
  //    logged-in account's) — leave those fields blank instead.
  if (result.source === 'generic') {
    if (!result.name) result.name = meta('og:title') || (document.title || '').split(/[|\-–]/)[0].trim()
    if (!result.title) result.title = meta('og:description') || meta('description')
    const visible = (document.body?.innerText || '')
    if (!result.email) { const m = visible.match(/[\w.+-]+@[\w-]+\.[\w.-]+/); if (m) result.email = m[0] }
    if (!result.phone) { const m = visible.match(/(\+?\d[\d\s().-]{8,}\d)/); if (m) result.phone = m[1].trim() }
  }

  return result
}
