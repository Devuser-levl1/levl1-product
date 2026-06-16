import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export interface JobBrief {
  title: string
  summary: string
  responsibilities: string[]
  mustHaveSkills: string[]
  niceToHaveSkills: string[]
  experience: string
  screeningCriteria: string[]
  suggestedInterviewFocus: string[]
}

// POST /api/hire/jobs/generate-brief — AI writes a deep, role-specific job brief
// from a role + optional "nudges" (specialization/seniority/industry/notes).
export const POST = withHireAuth(async (req) => {
  const { role, seniority, techStack, industry, notes, location, employmentType } = await req.json().catch(() => ({}))
  if (!role || !String(role).trim()) return NextResponse.json({ error: 'Role is required' }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI is not configured' }, { status: 503 })

  const prompt = `You are an expert technical recruiter writing a precise, role-specific job description.

Role: ${role}
${seniority ? `Seniority: ${seniority}` : ''}
${techStack ? `Tech stack / specialization: ${techStack}` : ''}
${industry ? `Industry: ${industry}` : ''}
${location ? `Location: ${location}` : ''}
${employmentType ? `Employment type: ${employmentType}` : ''}
${notes ? `Additional context: ${notes}` : ''}

Write a SPECIFIC brief tuned to the exact stack/specialization given — not a generic template.
If the stack is ".NET", reference .NET-specific skills (C#, ASP.NET Core, EF Core, Azure, etc).
If "Java microservices", reference Spring Boot, Kafka, Kubernetes, etc. Be concrete and current.

Return ONLY valid JSON (no markdown, no fences):
{
  "title": "polished job title",
  "summary": "2-3 sentence role overview",
  "responsibilities": ["6-8 specific responsibilities"],
  "mustHaveSkills": ["6-10 concrete must-have skills/technologies"],
  "niceToHaveSkills": ["4-6 nice-to-haves"],
  "experience": "experience requirement (e.g. '5+ years building .NET backend services')",
  "screeningCriteria": ["4-6 criteria to evaluate candidates against for THIS role"],
  "suggestedInterviewFocus": ["3-5 topics a first-round interview should probe"]
}`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async function attempt(): Promise<JobBrief> {
    const resp = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as Partial<JobBrief>
    // Normalize so the UI always gets arrays/strings.
    return {
      title: parsed.title || String(role),
      summary: parsed.summary || '',
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      mustHaveSkills: Array.isArray(parsed.mustHaveSkills) ? parsed.mustHaveSkills : [],
      niceToHaveSkills: Array.isArray(parsed.niceToHaveSkills) ? parsed.niceToHaveSkills : [],
      experience: parsed.experience || '',
      screeningCriteria: Array.isArray(parsed.screeningCriteria) ? parsed.screeningCriteria : [],
      suggestedInterviewFocus: Array.isArray(parsed.suggestedInterviewFocus) ? parsed.suggestedInterviewFocus : [],
    }
  }

  try {
    let brief: JobBrief
    try {
      brief = await attempt()
    } catch (parseErr) {
      // Retry once on a parse/format failure before giving up.
      console.warn('[generate-brief] first attempt failed, retrying:', parseErr instanceof Error ? parseErr.message : parseErr)
      brief = await attempt()
    }
    console.log('[generate-brief] generated brief for role="%s" stack="%s"', role, techStack ?? '')
    return NextResponse.json({ brief })
  } catch (err) {
    console.error('[generate-brief] failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not generate the brief. Please try again.' }, { status: 502 })
  }
})
