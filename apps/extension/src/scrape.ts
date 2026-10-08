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
  const result: Captured = {
    name: '', title: '', company: '', location: '', profileUrl: location.href.split('?')[0],
    email: '', phone: '', source: isLinkedIn ? 'linkedin' : isIndeed ? 'indeed' : 'generic',
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
    // Indeed résumé / candidate pages. Selectors are best-effort across Indeed's
    // résumé view and employer candidate detail; falls through to generic +
    // visible-text extraction below for anything not matched.
    if (!result.name) result.name = firstText(['[data-testid="resume-name"]', 'h1[itemprop="name"]', 'header h1', 'main h1', 'h1'])
    if (!result.title) result.title = firstText(['[data-testid="resume-headline"]', '[itemprop="jobTitle"]', 'h2.rezemp-ResumeDisplay-header'])
    if (!result.company) result.company = firstText(['[data-testid="work-experience"] [data-testid="company"]', '[itemprop="worksFor"]'])
    if (!result.location) result.location = firstText(['[data-testid="resume-location"]', '[itemprop="address"]'])
  }

  // ── Generic fallback from page metadata ──
  if (!result.name) result.name = meta('og:title') || (document.title || '').split(/[|\-–]/)[0].trim()
  if (!result.title) result.title = meta('og:description') || meta('description')

  // ── Email / phone — ONLY if visibly present (mailto/tel links or page text) ──
  const mailto = document.querySelector('a[href^="mailto:"]')
  if (mailto) result.email = (mailto.getAttribute('href') || '').replace('mailto:', '').split('?')[0].trim()
  const tel = document.querySelector('a[href^="tel:"]')
  if (tel) result.phone = (tel.getAttribute('href') || '').replace('tel:', '').trim()

  const visible = (document.body?.innerText || '')
  if (!result.email) { const m = visible.match(/[\w.+-]+@[\w-]+\.[\w.-]+/); if (m) result.email = m[0] }
  if (!result.phone) { const m = visible.match(/(\+?\d[\d\s().-]{8,}\d)/); if (m) result.phone = m[1].trim() }

  return result
}
