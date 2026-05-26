import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const questionText: string            = body.questionText ?? ''
    const expectedKeyPoints: string[]     = body.expectedKeyPoints ?? []
    const candidateResponse: string       = body.candidateResponse ?? ''
    const previousResponses: Array<{ question: string; response: string }> = body.previousResponses ?? []
    const dynamicIntensity: string        = body.dynamicIntensity ?? 'standard'

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

    const client = new Anthropic({ apiKey })

    const prevCtx = previousResponses.length
      ? '\n\nPrevious Q&A:\n' +
        previousResponses.slice(-3).map((p, i) => `Q${i + 1}: ${p.question}\nA${i + 1}: ${p.response}`).join('\n')
      : ''

    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      temperature: 0.1,
      system:
        'You are evaluating a candidate\'s interview response. Be objective and evidence-based. ' +
        'Only credit points the candidate explicitly mentioned — never infer or assume knowledge not demonstrated. ' +
        'Decide if a follow-up is warranted (answer was vague, too short, or incomplete). ' +
        'Keep evaluatorNote to 1-2 factual sentences only. ' +
        'Return ONLY valid JSON — no markdown, no explanation.',
      messages: [{
        role: 'user',
        content:
          `Question: "${questionText}"\n` +
          `Expected key points: ${expectedKeyPoints.join(', ')}\n` +
          `Candidate response: "${candidateResponse}"\n` +
          `Dynamic intensity: ${dynamicIntensity}${prevCtx}\n\n` +
          `Return ONLY this JSON:\n` +
          `{\n` +
          `  "score": <integer 0-10>,\n` +
          `  "keyPointsCovered": ["point1"],\n` +
          `  "keyPointsMissed": ["point2"],\n` +
          `  "evaluatorNote": "1-2 sentences",\n` +
          `  "shouldAskFollowUp": true|false,\n` +
          `  "followUpQuestion": "optional — only if shouldAskFollowUp is true",\n` +
          `  "generateDynamic": true|false,\n` +
          `  "suggestedTransition": "brief neutral phrase before moving on"\n` +
          `}`,
      }],
    })

    const raw   = res.content[0].type === 'text' ? res.content[0].text : '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json(result, { status: 200 })
  } catch (err: unknown) {
    console.error('evaluate-response error:', err instanceof Error ? err.message : err)
    // Return a safe fallback so the interview doesn't crash
    return NextResponse.json({
      score: 5,
      keyPointsCovered: [],
      keyPointsMissed: [],
      evaluatorNote: 'Evaluation unavailable.',
      shouldAskFollowUp: false,
      generateDynamic: false,
      suggestedTransition: 'Thank you.',
    }, { status: 200 })
  }
}
