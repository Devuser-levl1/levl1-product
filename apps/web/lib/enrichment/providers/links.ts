import { EnrichmentProvider, EnrichInput, ProviderResult, Links } from '../types'

// Universal — consolidates public profile URLs we already captured or that appear
// in the resume text. We only STORE/surface URLs; we never crawl auth-walled
// sites server-side. No network calls here.
export const linksProvider: EnrichmentProvider = {
  key: 'links',
  universal: true,
  async enrich(input: EnrichInput): Promise<ProviderResult> {
    const c = input.candidate
    const links: Links = {}
    const other: string[] = []

    const consider = (url: string) => {
      const u = url.trim().replace(/[)\],.;'"]+$/, '')
      if (!/^https?:\/\//i.test(u)) return
      const host = (() => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase() } catch { return '' } })()
      if (!host) return
      if (host.includes('linkedin.com')) links.linkedin ??= u
      else if (host.includes('github.com')) links.github ??= u
      else if (host === 'twitter.com' || host === 'x.com') links.twitter ??= u
      else if (host.includes('behance.net')) links.behance ??= u
      else if (host.includes('dribbble.com')) links.dribbble ??= u
      else if (/(portfolio|notion\.site|webflow\.io|carrd\.co)/.test(host)) links.portfolio ??= u
      else if (!other.includes(u)) other.push(u)
    }

    if (c.linkedinUrl) consider(c.linkedinUrl)
    if (c.resumeUrl) consider(c.resumeUrl)
    const urlRe = /https?:\/\/[^\s)<>"']+/gi
    for (const m of (c.resumeText ?? '').match(urlRe) ?? []) consider(m)

    // First non-classified personal URL → website (best-effort).
    if (!links.website && other.length) links.website = other.shift()
    if (other.length) links.other = other.slice(0, 5)

    // Ran successfully — finding zero links is a valid (empty) result, not a
    // failure, so it must not drag the whole enrichment to "partial".
    const count = Object.keys(links).length
    return count > 0
      ? { status: 'ok', source: 'captured links + resume', data: { links } }
      : { status: 'skipped', data: {} }
  },
}
