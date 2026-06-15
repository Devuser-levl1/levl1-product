import { EnrichmentProvider, EnrichInput, ProviderResult, GithubData, GithubPinned } from '../types'
import { cacheGet, cacheSet } from '../cache'

// Engineering-emphasized. Runs whenever a public GitHub handle is derivable
// (even for a non-engineering candidate who lists one) — absent without penalty
// otherwise. Uses GitHub's public REST API only. Cached 24h.

function deriveHandle(input: EnrichInput): string | null {
  const fromLink = input.acc.links?.github
  const candidates = [fromLink, input.candidate.resumeText ?? '', input.candidate.linkedinUrl ?? '']
  for (const src of candidates) {
    if (!src) continue
    const m = src.match(/github\.com\/([A-Za-z0-9-]{1,39})/)
    if (m && !['orgs', 'sponsors', 'features', 'about'].includes(m[1].toLowerCase())) return m[1]
  }
  return null
}

async function gh(path: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'Levl1-Hire-Enrichment' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return fetch(`https://api.github.com${path}`, { headers })
}

export const githubProvider: EnrichmentProvider = {
  key: 'github',
  universal: false,
  relevantFor: ['engineering'],
  shouldRun(input) { return deriveHandle(input) !== null },
  async enrich(input: EnrichInput): Promise<ProviderResult> {
    const handle = deriveHandle(input)
    if (!handle) return { status: 'skipped', data: {} }

    const cached = cacheGet<GithubData>(`gh:${handle}`)
    if (cached) return { status: 'ok', source: 'GitHub public API (cached)', data: { github: cached } }

    const userRes = await gh(`/users/${handle}`)
    if (userRes.status === 404) return { status: 'skipped', source: 'GitHub public API', data: {} }
    if (!userRes.ok) return { status: 'partial', source: 'GitHub public API', data: {} }
    const user = await userRes.json()

    let repos: Array<{ name: string; html_url: string; description: string | null; language: string | null; stargazers_count: number; pushed_at: string; fork: boolean }> = []
    const reposRes = await gh(`/users/${handle}/repos?sort=pushed&per_page=100`)
    if (reposRes.ok) repos = await reposRes.json()

    const own = repos.filter((r) => !r.fork)
    const langCount = new Map<string, number>()
    let totalStars = 0
    let lastActive: string | null = null
    for (const r of own) {
      if (r.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1)
      totalStars += r.stargazers_count || 0
      if (r.pushed_at && (!lastActive || r.pushed_at > lastActive)) lastActive = r.pushed_at
    }
    const topLanguages = Array.from(langCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l)
    const pinned: GithubPinned[] = Array.from(own).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 4)
      .map((r) => ({ name: r.name, stars: r.stargazers_count, language: r.language, url: r.html_url, description: r.description }))

    const data: GithubData = {
      handle,
      profileUrl: user.html_url ?? `https://github.com/${handle}`,
      publicRepos: user.public_repos ?? own.length,
      followers: user.followers ?? 0,
      topLanguages,
      totalStars,
      lastActiveAt: lastActive,
      pinned,
    }
    cacheSet(`gh:${handle}`, data)
    return { status: 'ok', source: 'GitHub public API', data: { github: data } }
  },
}
