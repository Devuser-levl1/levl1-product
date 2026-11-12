import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { parseExperience, sanitizeExperience } from '@/lib/screen/position-config'
import { sanitizeMustHaves } from '@/lib/screen/recruiter/must-haves'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Recruiter-only (paid AI call; the setup flow is signed in).
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  try {
    const { jdText } = await req.json()
    if (!jdText || jdText.trim().length < 50) {
      return NextResponse.json({ error: 'JD text too short' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: SCORING_MODEL,
      max_tokens: 1500,
      system: 'You are a JD parser. Extract structured information from job descriptions. Return only valid JSON, no markdown fences.',
      messages: [{
        role: 'user',
        content: `Parse this job description and return JSON with these exact fields:
{
  "requiredSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill1", "skill2"],
  "experienceLevel": "X-Y years",
  "experienceMin": <minimum years as a number, or null>,
  "experienceMax": <maximum years as a number, or null — if only a minimum is stated (e.g. '5+ years') use min + 3>,
  "mustHaves": ["requirements the JD marks as mandatory/required/must — short phrases, max 6; [] if none are explicit"],
  "roleType": "IC/Manager/Lead/Director/VP/PM",
  "primaryDomain": "domain name",
  "keyResponsibilities": ["responsibility1", "responsibility2"],
  "technicalRequirements": ["req1", "req2"],
  "leadershipRequirements": ["req1"],
  "extractedTechStack": ["tech1", "tech2"],
  "seniorityLevel": "junior/mid/senior/lead/principal/manager/director"
}

JD: ${jdText}`,
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>

    // Normalise the fields the setup form auto-fills (#6).
    const exp = sanitizeExperience(parsed.experienceMin, parsed.experienceMax) ?? parseExperience(parsed.experienceLevel)
    return NextResponse.json({
      ...parsed,
      experienceMin: exp?.min ?? null,
      experienceMax: exp?.max ?? null,
      mustHaves: sanitizeMustHaves(parsed.mustHaves),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'JD parsing failed'
    console.error('[parse-jd] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
