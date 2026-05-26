import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      candidateName        = '',
      positionTitle        = '',
      resumeHighlights     = '',
      sectionScores        = { technical: 0, behavioral: 0, scenario: 0, eq: 0 } as Record<string, number>,
      recommendation       = 'maybe',
      strengthAreas        = [] as string[],
      concernAreas         = [] as string[],
      transcriptExcerpt    = '',
    } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    const recLabel: Record<string, string> = {
      strong_yes: 'Strong Yes — proceed immediately',
      yes:        'Yes — recommend for next round',
      maybe:      'Maybe — further evaluation suggested',
      no:         'No — not suitable for this role',
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system:
        'You are a senior recruitment consultant writing a professional candidate evaluation summary for a hiring manager. ' +
        'Write in third person. Be factual and specific, grounded only in the data provided. ' +
        'Never fabricate achievements or experiences not mentioned. ' +
        'Be balanced — acknowledge both strengths and concerns. ' +
        'Keep to exactly 4–5 sentences. End with a clear, direct recommendation sentence. ' +
        'Return ONLY the paragraph text — no title, no JSON, no markdown.',
      messages: [{
        role: 'user',
        content:
          `Write a professional candidate summary for ${candidateName}, ` +
          `who interviewed for the role of ${positionTitle}.\n\n` +
          `Candidate background: ${resumeHighlights || 'Senior professional with relevant experience.'}\n\n` +
          `Interview performance:\n` +
          `  Technical score: ${sectionScores.technical}/100\n` +
          `  Behavioral score: ${sectionScores.behavioral}/100\n` +
          `  Scenario score: ${sectionScores.scenario}/100\n` +
          `  EQ score: ${sectionScores.eq}/100\n\n` +
          `Key strengths observed: ${strengthAreas.join(', ') || 'Strong domain expertise'}\n` +
          `Key concerns observed: ${concernAreas.join(', ') || 'None significant'}\n\n` +
          `Recommendation: ${recLabel[recommendation] ?? recommendation}\n\n` +
          (transcriptExcerpt ? `Transcript excerpt:\n${transcriptExcerpt.slice(0, 1500)}\n` : ''),
      }],
    })

    const summary = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    return NextResponse.json({ summary }, { status: 200 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Summary generation failed'
    console.error('generate-candidate-summary error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
