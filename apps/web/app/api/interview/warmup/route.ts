import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'
import { WARMUP_FOLLOWUP_SYSTEM } from '@/lib/screen/session/persona'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

// ── Warm-up beat 2: the single reactive follow-up (Build 03) ───────────────
// Generates ONE genuine follow-up conditioned on the candidate's actual reply.
// Persona/guardrails live in lib/screen/session/persona.ts. Voice-only; neutral
// employer framing; deflects outcome-fishing. Falls back to a safe line if AI
// is unavailable so the warm-up never blocks the interview.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const firstName = typeof body.firstName === 'string' ? body.firstName : 'there'
  const reply = typeof body.candidateReply === 'string' ? body.candidateReply.trim() : ''
  const role = typeof body.role === 'string' ? body.role : 'this'
  const day = body.dayContext?.dayOfWeek ?? ''
  const part = body.dayContext?.partOfDay ?? ''

  const fallback = reply ? `Thanks for sharing that. Glad you're here.` : `No worries at all — glad you could make it.`

  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ line: fallback })
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const resp = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 120,
      temperature: 0.7,
      system: WARMUP_FOLLOWUP_SYSTEM,
      messages: [{
        role: 'user',
        content: `Candidate first name: ${firstName}\nRole being screened: ${role}\nIt is currently ${day} ${part}.\n` +
          `The candidate just replied to "how's your day going": "${reply || '(no reply / silence)'}"\n\n` +
          `Write the single reactive follow-up line now.`,
      }],
    })
    const line = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim()
    return NextResponse.json({ line: line || fallback })
  } catch (e) {
    console.error('[interview/warmup] failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ line: fallback })
  }
}
