import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'
import { EnrichmentProvider, EnrichInput, ProviderResult, NormalizedProfile } from '../types'

// Universal backbone — always runs. Produces a clean structured profile from the
// resume + captured fields. Uses Claude when resume text is available; otherwise
// falls back to the fields we already have (no fabrication).
export const resumeProvider: EnrichmentProvider = {
  key: 'resume',
  universal: true,
  async enrich(input: EnrichInput): Promise<ProviderResult> {
    const c = input.candidate
    const base: NormalizedProfile = {
      currentTitle: c.currentTitle ?? null,
      currentEmployer: c.currentCompany ?? null,
      yearsExperience: null,
      location: null,
      skills: Array.isArray(c.skills) ? c.skills : [],
      education: [],
      certifications: [],
    }

    const text = (c.resumeText ?? '').trim()
    if (!process.env.ANTHROPIC_API_KEY || text.length < 60) {
      return { status: base.currentTitle || base.skills.length ? 'ok' : 'partial', source: 'resume + captured fields', data: { profile: base } }
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 900,
      temperature: 0,
      system: 'You normalize resumes. Extract only what is explicitly stated. Never invent facts. Return ONLY valid JSON, no markdown.',
      messages: [{
        role: 'user',
        content: `Extract a normalized profile as JSON (use null / [] when absent):
{
  "currentTitle": "string|null",
  "currentEmployer": "string|null",
  "yearsExperience": number|null,
  "location": "string|null",
  "skills": ["..."],
  "education": ["Degree, Institution, Year"],
  "certifications": ["..."]
}

Resume:
${text.slice(0, 6000)}`,
      }],
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Partial<NormalizedProfile>

    const profile: NormalizedProfile = {
      currentTitle: parsed.currentTitle || base.currentTitle,
      currentEmployer: parsed.currentEmployer || base.currentEmployer,
      yearsExperience: typeof parsed.yearsExperience === 'number' ? parsed.yearsExperience : (c.skills ? null : null),
      location: parsed.location || null,
      skills: Array.isArray(parsed.skills) && parsed.skills.length ? parsed.skills : base.skills,
      education: Array.isArray(parsed.education) ? parsed.education : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    }
    return { status: 'ok', source: 'resume (AI-normalized)', data: { profile } }
  },
}
