import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { LIVE_INTERVIEW_MODEL } from '@/lib/screen/interview/model'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'
import { closingAnswerSystem, closingFallback } from '@/lib/screen/session/closing'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

// ── Closing Q&A: answer the candidate's question (#4, real-user bug) ───────
// The interview used to end abruptly after one line. The room now asks "do you
// have any questions for me?" and sends each question here. The answer is
// honest and warm: general next steps only, NO invented timelines, salaries,
// outcomes or team details, and outcome-fishing is deflected. This segment is
// UNSCORED (transcript segment 'closing_qa' is excluded from every scorer).
// Never blocks: on any failure the room speaks a safe fallback.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 600) : ''
  const role = typeof body.role === 'string' ? body.role.slice(0, 120) : 'this role'
  const company = typeof body.company === 'string' ? body.company.slice(0, 120) : ''
  const name = typeof body.interviewerName === 'string' && /^[A-Za-z][A-Za-z .'-]{0,30}$/.test(body.interviewerName.trim()) ? body.interviewerName.trim() : INTERVIEWER_NAME
  const fallback = closingFallback(question)
  if (!question || !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ line: fallback })
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const resp = await client.messages.create({
      model: LIVE_INTERVIEW_MODEL,
      max_tokens: 200,
      system: closingAnswerSystem(name),
      messages: [{ role: 'user', content: `Role: ${role}${company ? `\nCompany: ${company}` : ''}\n\nThe candidate asks: "${question}"\n\nWrite your spoken answer now.` }],
    })
    const line = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim()
    return NextResponse.json({ line: line || fallback })
  } catch (e) {
    console.error(JSON.stringify({ evt: 'brain_unavailable', route: 'closing', detail: (e instanceof Error ? e.message : String(e)).slice(0, 300) }))
    return NextResponse.json({ line: fallback })
  }
}
