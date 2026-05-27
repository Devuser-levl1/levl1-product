import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface CandidateSummary {
  id?: string
  name: string
  score: number
  recommendation: string
  strengthAreas?: string[]
  concernAreas?: string[]
  sectionScores?: Record<string, { score: number; outOf: number } | number>
  professionalSummary?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const position: Record<string, unknown> = body.position ?? {}
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
        `${i + 1}. ${c.name} — Score: ${c.score}/100 — Recommendation: ${c.recommendation}\n` +
        `   Strengths: ${(c.strengthAreas ?? []).join(', ') || 'N/A'}\n` +
        `   Concerns: ${(c.concernAreas ?? []).join(', ') || 'N/A'}`
      )
      .join('\n\n')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system:
        'You are a recruitment analytics expert reviewing multiple candidates for the same role. ' +
        'Identify genuine patterns across candidates — common strengths suggest a strong talent pool in that area; ' +
        'common gaps suggest market shortage or question calibration issues. ' +
        'Be specific and evidence-based. ' +
        'Flag questions consistently poorly answered as requiring review. ' +
        'Keep market observations grounded — do not speculate beyond the data. ' +
        'Return ONLY valid JSON — no markdown, no explanation.',
      messages: [
        {
          role: 'user',
          content:
            `Generate a position-level summary report for:\n` +
            `Position: ${position.title}\n` +
            `Company: ${position.company}\n` +
            `Department: ${position.department}\n` +
            `Tech Stack: ${(position.techStack as string[] | undefined)?.join(', ') || 'N/A'}\n` +
            `Experience Level: ${position.experienceLevel}\n\n` +
            `Completed interviews (${completedCandidates.length}):\n${candidateList}\n\n` +
            `Return ONLY this JSON object:\n` +
            `{\n` +
            `  "poolStrengths": ["strength observed across multiple candidates", ...],\n` +
            `  "poolGaps": ["gap observed across multiple candidates", ...],\n` +
            `  "marketObservation": "2-3 sentence paragraph about talent availability for this role",\n` +
            `  "questionHealthFlags": [\n` +
            `    {\n` +
            `      "questionText": "question that got consistently poor responses",\n` +
            `      "reason": "why it is flagged — e.g. 5 of 7 candidates scored below 5/10",\n` +
            `      "recommendation": "what to do — rewrite, remove, or make optional"\n` +
            `    }\n` +
            `  ],\n` +
            `  "hiringRecommendation": "overall recommendation paragraph for this position"\n` +
            `}`,
        },
      ],
      temperature: 0.2,
    })

    const raw   = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const report = JSON.parse(clean)

    return NextResponse.json({
      ...report,
      positionId: position.id as string,
      generatedAt: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Summary generation failed'
    console.error('generate-position-summary error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
