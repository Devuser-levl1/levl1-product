import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { LIVE_INTERVIEW_MODEL } from '@/lib/screen/interview/model'
import { warmupFollowupSystem, warmupOpenerSystem } from '@/lib/screen/session/persona'
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
  // Name that matches the account's interviewer voice (resolved by the room).
  const name = typeof body.interviewerName === 'string' && /^[A-Za-z][A-Za-z .'-]{0,30}$/.test(body.interviewerName.trim()) ? body.interviewerName.trim() : INTERVIEWER_NAME

  // Fallbacks ROTATE so an AI outage never makes every interview open identically.
  const pickOne = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
  const when = part ? `this ${part}` : 'today'
  const fallback = isOpener
    ? pickOne([
        `Hi ${firstName}, thanks for making time ${when}. I'm ${name}, your AI interviewer for this screen — before we dive in, how's your ${day || 'day'} going so far?`,
        `Hello ${firstName}, I'm ${name}. Thanks for joining ${when}. Before we get into the role, how has your ${day || 'day'} been?`,
        `Hi ${firstName} — ${name} here, I'll be running your interview. Good to meet you. Anything keeping you busy ${when}?`,
        `Welcome, ${firstName}. I'm ${name}, your AI interviewer. Before the questions, how are you doing ${when}?`,
        `Hi ${firstName}, thanks for being here. I'm ${name}. Quick one before we start — how's the ${day || 'week'} treating you?`,
      ] as const)
    : reply
      ? pickOne(['Thanks for sharing that. Glad you\'re here.', 'Good to hear, thank you.', 'Thanks — appreciate you taking the time.', 'Understood, thanks for that.'] as const)
      : pickOne(['No worries at all — glad you could make it.', 'That\'s fine — let\'s get started.', 'No problem at all.'] as const)

  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ line: fallback })
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const resp = await client.messages.create({
      model: LIVE_INTERVIEW_MODEL,
      max_tokens: isOpener ? 160 : 120,
      temperature: isOpener ? 0.9 : 0.7,  // opener hotter → genuinely varied each run
      system: isOpener ? warmupOpenerSystem(name) : warmupFollowupSystem(name),
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
    // LOUD: a failing warm-up usually means the brain is down for the whole interview.
    console.error(JSON.stringify({ evt: 'brain_unavailable', route: 'warmup', detail: (e instanceof Error ? e.message : String(e)).slice(0, 300) }))
    return NextResponse.json({ line: fallback })
  }
}
