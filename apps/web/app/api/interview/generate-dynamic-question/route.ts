import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { INTERVIEW_MODEL } from '@/lib/screen/interview/model'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const candidateResume: string    = body.candidateResume ?? ''
    const positionTitle: string      = body.positionTitle ?? ''
    const techStack: string[]        = body.techStack ?? []
    const previousResponses: Array<{ question: string; response: string }> = body.previousResponses ?? []
    const lastResponse: string       = body.lastResponse ?? ''
    const dynamicType: string        = body.dynamicType ?? 'followup'
    const questionText: string       = body.questionText ?? ''  // original Q (for 'simplify')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

    const client = new Anthropic({ apiKey })

    const prevCtx = previousResponses
      .slice(-3)
      .map((p) => `Q: ${p.question}\nA: ${p.response}`)
      .join('\n\n')

    const typeGuide =
      dynamicType === 'project_deepdive' ? 'Ask about a specific project or achievement from their resume — go deep on what they personally built or owned.' :
      dynamicType === 'coding'           ? 'Give a specific coding or technical design challenge directly relevant to their stated tech stack. Favour one that surfaces an EDGE CASE — failure modes, error handling, scale, or concurrency.' :
      dynamicType === 'simplify'         ? 'The candidate is STUCK on the question below. Re-ask a SIMPLER, more guided version: narrow it to one concrete sub-part, offer a small hint or a starting example, or make it more specific so they have an entry point. Warm and encouraging, no pressure. This is a single gentle attempt to unblock them — do not stack multiple asks.' :
      'Ask a focused follow-up that probes the single highest-signal gap in what they just said — the most important weakness or unverified claim, not the easiest thing to ask.'

    const res = await client.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 200,
      // Opus 4.8 rejects temperature/top_p/top_k. Low effort keeps generation snappy.
      output_config: { effort: 'low' },
      system:
        'You are a senior technical interviewer conducting a live interview. ' +
        'Generate exactly ONE focused question. ' +
        'Reference the candidate\'s specific experience, projects, or technologies where possible. ' +
        'Prefer questions that test depth via a relevant edge case (failure modes, scale, concurrency, error handling) when the topic is technical. ' +
        'Be conversational — this should feel natural in a live interview, not like a written quiz. ' +
        'No positive reinforcement. No preamble. Return only the question text.',
      messages: [{
        role: 'user',
        content:
          `Position: ${positionTitle}\n` +
          `Tech stack: ${techStack.join(', ')}\n` +
          `Resume highlights: ${candidateResume || 'Not provided'}\n\n` +
          `Recent interview exchange:\n${prevCtx}\n\n` +
          (questionText ? `Original question they are stuck on: "${questionText}"\n\n` : '') +
          `Candidate just said: "${lastResponse}"\n\n` +
          `Type: ${typeGuide}\n\n` +
          `Generate ONE question now:`,
      }],
    })

    const question = res.content[0].type === 'text'
      ? res.content[0].text.trim()
      : 'Can you tell me more about that?'

    return NextResponse.json({ question }, { status: 200 })
  } catch (err: unknown) {
    console.error('generate-dynamic-question error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ question: 'Can you walk me through that in more detail?' }, { status: 200 })
  }
}
