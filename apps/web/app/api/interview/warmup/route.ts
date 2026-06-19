import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { LIVE_INTERVIEW_MODEL } from '@/lib/screen/interview/model'
import { WARMUP_FOLLOWUP_SYSTEM, WARMUP_OPENER_SYSTEM } from '@/lib/screen/session/persona'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

// ── Warm-up generation (Build 03 + Fix 4) ──────────────────────────────────
// beat:'opener' → a VARIED, warm ice-breaker (different every run).
// otherwise   → beat 2, the single reactive follow-up conditioned on the reply.
// Persona/guardrails live in lib/screen/session/persona.ts. Neutral employer
// framing; deflects outcome-fishing. Falls back to a safe line if AI is
// unavailable so the warm-up never blocks the interview.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const firstName = typeof body.firstName === 'string' ? body.firstName : 'there'
  const reply = typeof body.candidateReply === 'string' ? body.candidateReply.trim() : ''
  const role = typeof body.role === 'string' ? body.role : 'this'
  const day = body.dayContext?.dayOfWeek ?? ''
  const part = body.dayContext?.partOfDay ?? ''
  const isOpener = body.beat === 'opener'

  const fallback = isOpener
    ? `Hi ${firstName}, thanks for making time this ${part || 'today'}. I'm ${INTERVIEWER_NAME}, your AI interviewer for this screen — before we dive in, how's your ${day || 'day'} going so far?`
    : (reply ? `Thanks for sharing that. Glad you're here.` : `No worries at all — glad you could make it.`)

  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ line: fallback })
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const resp = await client.messages.create({
      model: LIVE_INTERVIEW_MODEL,
      max_tokens: isOpener ? 160 : 120,
      temperature: isOpener ? 0.9 : 0.7,  // opener hotter → genuinely varied each run
      system: isOpener ? WARMUP_OPENER_SYSTEM : WARMUP_FOLLOWUP_SYSTEM,
      messages: [{
        role: 'user',
        content: isOpener
          ? `Candidate first name: ${firstName}\nIt is currently ${day} ${part} (their local time — reference it correctly).\nWrite the opening line now.`
          : `Candidate first name: ${firstName}\nRole being screened: ${role}\nIt is currently ${day} ${part}.\n` +
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
