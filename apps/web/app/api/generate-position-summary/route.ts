import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface CandidateSummary {
  name: string
  score: number
  recommendation: string
  strengthAreas: string[]
  concernAreas: string[]
  sectionScores: Record<string, number>
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const position: Record<string, unknown>  = body.position ?? {}
    const completedCandidates: CandidateSummary[] = body.completedCandidates ?? []

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
    }

    if (completedCandidates.length < 1) {
      return NextResponse.json({ error: 'At least 1 completed interview required' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey })

    const candidateList = completedCandidates
      .map((c, i) =>
        `${i + 1}. ${c.name} — Score: ${c.score}/100 — Recommendation: ${c.recommendation} — ` +
        `Strengths: ${(c.strengthAreas ?? []).join(', ') || 'N/A'} — ` +
        `Concerns: ${(c.concernAreas ?? []).join(', ') || 'N/A'}`
      )
      .join('\n')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'You are a recruitment analytics expert. ' +
        'Generate a position-level summary report based on all completed interviews. ' +
        'Identify patterns across candidates — common strengths, common gaps, market observations. ' +
        'Be specific, evidence-based, and professional. ' +
        'Flag questions that were consistently poorly answered. ' +
        'Return ONLY valid JSON — no markdown, no explanation.',
      messages: [{
        role: 'user',
        content:
          `Generate a position summary report for:\n` +
          `Position: ${position.title}\n` +
          `Company: ${position.company}\n` +
          `Department: ${position.department}\n` +
          `Tech Stack: ${(position.techStack as string[] | undefined)?.join(', ') || 'N/A'}\n` +
          `Experience Level: ${position.experienceLevel}\n\n` +
          `Completed interviews (${completedCandidates.length}):\n${candidateList}\n\n` +
          `Return ONLY this JSON object:\n` +
          `{\n` +
          `  "overallInsights": "2-3 sentence executive summary of the talent pool",\n` +
          `  "commonStrengths": ["strength1", "strength2", "strength3"],\n` +
          `  "commonGaps": ["gap1", "gap2", "gap3"],\n` +
          `  "marketObservation": "1-2 sentences about the talent market for this role",\n` +
          `  "questionHealthFlags": [\n` +
          `    { "question": "question text that got poor responses", "recommendation": "why and what to change" }\n` +
          `  ]\n` +
          `}`,
      }],
    })

    const raw   = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const report = JSON.parse(clean)

    return NextResponse.json(report, { status: 200 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Summary generation failed'
    console.error('generate-position-summary error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
