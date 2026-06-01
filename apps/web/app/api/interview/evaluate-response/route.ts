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
        'You are the decision engine for Alex, a professional AI interviewer.\n\n' +
        'ROLE: Evaluate candidate responses objectively and decide how Alex should proceed.\n' +
        'Only credit points the candidate explicitly mentioned — never infer or assume knowledge not demonstrated.\n' +
        'Keep evaluatorNote to 1-2 factual sentences only.\n\n' +
        'ALEX\'S TONE RULES (apply to all generated text):\n' +
        '- NEVER use: "Great answer", "Excellent", "Perfect", "Wonderful", "Fantastic"\n' +
        '- ALWAYS use: "Thank you", "Understood", "Got it", "Noted", "That is helpful"\n' +
        '- Calm, warm, professional at all times — never make the candidate feel judged\n\n' +
        'FOLLOW-UP QUESTION RULES (when shouldAskFollowUp is true):\n' +
        '- Strong answer: "You mentioned [X] — how did that play out in practice?" or "Interesting. What would you do differently in hindsight?"\n' +
        '- Vague or incomplete: "Can you walk me through a specific example of that?" or "That makes sense at a high level — can you get more concrete?"\n' +
        '- Off-topic: "I appreciate that context. Let me bring it back to [specific aspect of the question]."\n' +
        '- Candidate struggled: "No worries — let me come at it from a different angle." or "Fair enough — let us move on and come back to this if time allows."\n\n' +
        'RELEVANCE SCORE (relevanceScore 0-10) — how well the response addresses the question:\n' +
        '- 9-10: Directly and comprehensively addresses the question asked\n' +
        '- 7-8: Mostly relevant with only minor tangents\n' +
        '- 5-6: Partially relevant — touches the topic but misses key aspects\n' +
        '- 3-4: Mostly off-topic, only superficially related to the question\n' +
        '- 0-2: Completely irrelevant or does not address the question at all\n\n' +
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
          `  "relevanceScore": <integer 0-10>,\n` +
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
      relevanceScore: 5,
      keyPointsCovered: [],
      keyPointsMissed: [],
      evaluatorNote: 'Evaluation unavailable.',
      shouldAskFollowUp: false,
      generateDynamic: false,
      suggestedTransition: 'Thank you.',
    }, { status: 200 })
  }
}
