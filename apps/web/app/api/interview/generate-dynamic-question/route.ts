import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const candidateResume: string    = body.candidateResume ?? ''
    const positionTitle: string      = body.positionTitle ?? ''
    const techStack: string[]        = body.techStack ?? []
    const previousResponses: Array<{ question: string; response: string }> = body.previousResponses ?? []
    const lastResponse: string       = body.lastResponse ?? ''
    const dynamicType: string        = body.dynamicType ?? 'followup'

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

    const client = new Anthropic({ apiKey })

    const prevCtx = previousResponses
      .slice(-3)
      .map((p) => `Q: ${p.question}\nA: ${p.response}`)
      .join('\n\n')

    const typeGuide =
      dynamicType === 'project_deepdive' ? 'Ask about a specific project or achievement from their resume — go deep on what they personally built or owned.' :
      dynamicType === 'coding'           ? 'Give a specific coding or technical design challenge directly relevant to their stated tech stack.' :
      'Ask a focused follow-up that probes something specific they just mentioned.'

    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      temperature: 0.5,
      system:
        'You are a senior technical interviewer conducting a live interview. ' +
        'Generate exactly ONE focused question. ' +
        'Reference the candidate\'s specific experience, projects, or technologies where possible. ' +
        'Be conversational — this should feel natural in a live interview, not like a written quiz. ' +
        'No positive reinforcement. No preamble. Return only the question text.',
      messages: [{
        role: 'user',
        content:
          `Position: ${positionTitle}\n` +
          `Tech stack: ${techStack.join(', ')}\n` +
          `Resume highlights: ${candidateResume || 'Not provided'}\n\n` +
          `Recent interview exchange:\n${prevCtx}\n\n` +
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
