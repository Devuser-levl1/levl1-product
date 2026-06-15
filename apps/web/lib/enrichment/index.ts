import { EnrichmentProvider, EnrichInput, EnrichmentMerged, EnrichCandidate, RoleFamily } from './types'
import { inferRoleFamily } from './role'
import { resumeProvider } from './providers/resume'
import { linksProvider } from './providers/links'
import { companyProvider } from './providers/company'
import { githubProvider } from './providers/github'
import { webSummaryProvider } from './providers/websummary'

// Registry — adding a provider later (e.g. sales-intelligence, licensing) is a
// new file + one entry here. No rewrite, no schema change.
const REGISTRY: EnrichmentProvider[] = [
  resumeProvider, linksProvider, companyProvider, githubProvider, webSummaryProvider,
]

// Orchestration phases (dependency-aware): early local providers build the
// profile + links; mid networked providers run in parallel reading that
// context; the summary runs last on everything collected.
const EARLY = new Set(['resume', 'links'])
const LATE = new Set(['websummary'])

const TOTAL_BUDGET_MS = 12_000
const TIMEOUT = '__timeout__'

function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T | typeof TIMEOUT> {
  return Promise.race([p, new Promise<typeof TIMEOUT>((res) => setTimeout(() => res(TIMEOUT), ms))])
}

function isSelected(p: EnrichmentProvider, roleFamily: RoleFamily, input: EnrichInput): boolean {
  return p.universal || (p.relevantFor?.includes(roleFamily) ?? false) || (p.shouldRun?.(input) ?? false)
}

export interface EnrichmentOutcome {
  roleFamily: RoleFamily
  merged: EnrichmentMerged
  sources: string[]
  status: 'enriched' | 'partial' | 'failed'
}

export async function runEnrichment(candidate: EnrichCandidate): Promise<EnrichmentOutcome> {
  const roleFamily = inferRoleFamily({
    jobTitle: candidate.jobTitle, jobDescription: candidate.jobDescription,
    candidateTitle: candidate.currentTitle, resumeText: candidate.resumeText,
  })

  const acc: EnrichmentMerged = {}
  const sources: string[] = []
  let contributed = false
  let degraded = false
  const start = Date.now()
  const remaining = () => TOTAL_BUDGET_MS - (Date.now() - start)

  const merge = (data: EnrichmentMerged) => {
    for (const k of Object.keys(data) as (keyof EnrichmentMerged)[]) {
      if (data[k] !== undefined && data[k] !== null) { (acc as Record<string, unknown>)[k] = data[k]; contributed = true }
    }
  }

  const run = async (p: EnrichmentProvider) => {
    const input: EnrichInput = { candidate, roleFamily, acc }
    if (!isSelected(p, roleFamily, input)) return
    const budget = Math.min(7000, remaining())
    if (budget < 500) { degraded = true; return } // out of time → partial
    try {
      const r = await raceTimeout(p.enrich(input), budget)
      if (r === TIMEOUT) { degraded = true; console.warn(`[enrichment] provider ${p.key} timed out`); return }
      if (r.status === 'failed') { degraded = true; return }
      merge(r.data)
      if (r.source && r.status !== 'skipped') sources.push(r.source)
      if (r.status === 'partial') degraded = true
    } catch (e) {
      degraded = true
      console.error(`[enrichment] provider ${p.key} failed:`, e instanceof Error ? e.message : e)
    }
  }

  // Phase 1 — early, sequential (local; builds profile + links into acc).
  for (const p of REGISTRY.filter((p) => EARLY.has(p.key))) await run(p)
  // Phase 2 — mid, parallel (networked; read acc; github.shouldRun now sees links).
  await Promise.all(REGISTRY.filter((p) => !EARLY.has(p.key) && !LATE.has(p.key)).map(run))
  // Phase 3 — late (summary over everything collected).
  for (const p of REGISTRY.filter((p) => LATE.has(p.key))) await run(p)

  const status: EnrichmentOutcome['status'] = !contributed ? 'failed' : degraded ? 'partial' : 'enriched'
  return { roleFamily, merged: acc, sources: Array.from(new Set(sources)), status }
}
