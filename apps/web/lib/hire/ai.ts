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

export interface CandidateScore {
  score: number
  topSkills: string[]
  missingSkills: string[]
  summary: string
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no'
  redFlags: string[]
}

export async function scoreCandidate(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
): Promise<CandidateScore> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are an expert recruiter evaluating a candidate for a role.

Job Title: ${jobTitle}

Job Description:
${jobDescription.slice(0, 2000)}

Candidate Resume:
${resumeText.slice(0, 2000)}

Evaluate this candidate and return ONLY valid JSON in this exact format:
{
  "score": <number 0-100>,
  "topSkills": ["skill1", "skill2", "skill3"],
  "missingSkills": ["skill1", "skill2"],
  "summary": "<2-3 sentence summary of fit>",
  "recommendation": "<strong_yes|yes|maybe|no>",
  "redFlags": ["<any concerns, or empty array>"]
}

Score guide: 85+ = strong yes, 70-84 = yes, 55-69 = maybe, below 55 = no.
Base score ONLY on what is explicitly in the resume. Do not infer.`

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 800,
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as CandidateScore
}
