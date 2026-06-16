import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'

/**
 * Baseline résumé summary — used when a candidate isn't attached to a job yet,
 * so there's no JD to score against. Produces a short neutral professional
 * summary + top skills purely from the résumé (no fit judgement, no score).
 */
export async function baselineResumeSummary(resumeText: string): Promise<{ summary: string; topSkills: string[] }> {
  if (!process.env.ANTHROPIC_API_KEY || resumeText.trim().length < 40) {
    return { summary: '', topSkills: [] }
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const res = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 400,
    temperature: 0.2,
    system: 'You summarize résumés factually. Use ONLY what is stated. No fit judgement, no score, no hiring recommendation. Return ONLY valid JSON.',
    messages: [{
      role: 'user',
      content: `From this résumé, return ONLY JSON:
{ "summary": "<2-3 neutral sentences: who they are, seniority, core domains/skills>", "topSkills": ["skill1","skill2","skill3"] }

Résumé:
${resumeText.slice(0, 6000)}`,
    }],
  })
  const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { summary?: string; topSkills?: string[] }
    return { summary: parsed.summary ?? '', topSkills: Array.isArray(parsed.topSkills) ? parsed.topSkills : [] }
  } catch { return { summary: '', topSkills: [] } }
}

// NOTE: the old `scoreCandidate(resumeText, jd, title)` prompt was RETIRED in the
// scoring-unification fix. It produced a SECOND, divergent candidate-vs-job score
// that conflicted with the P0-3 match score. All candidate-vs-job scoring now goes
// through lib/hire/ai-matching.ts (scoreCandidateForJob → HireMatch). Do not add a
// separate scoring prompt here.
