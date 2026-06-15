import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'
import { EnrichmentProvider, EnrichInput, ProviderResult, CompanyContext } from '../types'
import { cacheGet, cacheSet } from '../cache'

// Universal — public company context for the candidate's current/most-recent
// employer (industry, size band, location). High value for sales/finance/ops
// where "where they've worked" is the key signal. Sourced from public company
// knowledge via Claude with strict honesty: only well-known facts, null when
// unsure — never fabricated. Cached 24h per company name.
export const companyProvider: EnrichmentProvider = {
  key: 'company',
  universal: true,
  async enrich(input: EnrichInput): Promise<ProviderResult> {
    const name = (input.acc.profile?.currentEmployer || input.candidate.currentCompany || '').trim()
    if (!name) return { status: 'skipped', data: {} }

    const cached = cacheGet<CompanyContext>(`co:${name.toLowerCase()}`)
    if (cached) return { status: 'ok', source: 'public company data (cached)', data: { company: cached } }

    if (!process.env.ANTHROPIC_API_KEY) {
      const minimal: CompanyContext = { name, industry: null, sizeBand: null, location: null }
      return { status: 'partial', source: 'employer name only', data: { company: minimal } }
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      temperature: 0,
      system: 'You provide public, widely-known company facts only. If you are not confident a company is real and well-known, return nulls. NEVER guess or fabricate. Return ONLY valid JSON.',
      messages: [{
        role: 'user',
        content: `For the company "${name}", return JSON with only widely-known public facts (null if unsure):
{ "industry": "string|null", "sizeBand": "one of 1-10|11-50|51-200|201-1000|1000+ or null", "location": "HQ city/country or null" }`,
      }],
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Partial<CompanyContext>
    const company: CompanyContext = {
      name,
      industry: parsed.industry || null,
      sizeBand: parsed.sizeBand || null,
      location: parsed.location || null,
    }
    cacheSet(`co:${name.toLowerCase()}`, company)
    // Completed successfully — unknown company facts (all null) is an honest
    // empty result the UI surfaces, not a failure.
    return { status: 'ok', source: 'public company data', data: { company } }
  },
}
