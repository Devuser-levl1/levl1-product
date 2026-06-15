import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'
import { EnrichmentProvider, EnrichInput, ProviderResult } from '../types'

// Universal — writes a SHORT, neutral professional summary from the public
// snippets ALREADY collected by other providers (profile, company, links,
// github). No speculative crawling. It must not assert anything not present in
// the collected data; the UI labels it "AI-generated — verify before relying."
export const webSummaryProvider: EnrichmentProvider = {
  key: 'websummary',
  universal: true,
  async enrich(input: EnrichInput): Promise<ProviderResult> {
    const { profile, company, github, links } = input.acc
    if (!process.env.ANTHROPIC_API_KEY) return { status: 'skipped', data: {} }

    // Assemble ONLY collected facts.
    const facts: string[] = []
    if (profile?.currentTitle) facts.push(`Title: ${profile.currentTitle}`)
    if (profile?.currentEmployer) facts.push(`Employer: ${profile.currentEmployer}`)
    if (profile?.yearsExperience != null) facts.push(`Experience: ${profile.yearsExperience} years`)
    if (profile?.location) facts.push(`Location: ${profile.location}`)
    if (profile?.skills?.length) facts.push(`Skills: ${profile.skills.slice(0, 15).join(', ')}`)
    if (profile?.education?.length) facts.push(`Education: ${profile.education.join('; ')}`)
    if (profile?.certifications?.length) facts.push(`Certifications: ${profile.certifications.join('; ')}`)
    if (company?.industry || company?.sizeBand) facts.push(`Employer context: ${[company.industry, company.sizeBand && `${company.sizeBand} employees`, company.location].filter(Boolean).join(', ')}`)
    if (github) facts.push(`GitHub: ${github.publicRepos} repos, ${github.totalStars} stars, languages ${github.topLanguages.join('/')}`)
    if (links) facts.push(`Public links: ${Object.entries(links).filter(([k]) => k !== 'other').map(([k]) => k).join(', ')}`)

    if (facts.length < 2) return { status: 'skipped', data: {} }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 260,
      temperature: 0.2,
      system: 'You write a neutral, factual 2-3 sentence professional summary using ONLY the facts provided. Do not infer, embellish, or add anything not present. No opinions, no hiring recommendation.',
      messages: [{ role: 'user', content: `Facts:\n${facts.join('\n')}\n\nWrite the summary.` }],
    })
    const summary = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    return summary ? { status: 'ok', source: 'AI summary (Claude)', data: { summary } } : { status: 'partial', data: {} }
  },
}
