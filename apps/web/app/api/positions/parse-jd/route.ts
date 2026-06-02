import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { jdText } = await req.json()
    if (!jdText || jdText.trim().length < 50) {
      return NextResponse.json({ error: 'JD text too short' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      system: 'You are a JD parser. Extract structured information from job descriptions. Return only valid JSON, no markdown fences.',
      messages: [{
        role: 'user',
        content: `Parse this job description and return JSON with these exact fields:
{
  "requiredSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill1", "skill2"],
  "experienceLevel": "X-Y years",
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
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'JD parsing failed'
    console.error('[parse-jd] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
