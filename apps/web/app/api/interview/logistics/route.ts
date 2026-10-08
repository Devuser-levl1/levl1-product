import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { LIVE_INTERVIEW_MODEL } from '@/lib/screen/interview/model'
import { readLogisticsConfig } from '@/lib/screen/logistics/config'
import {
  LOGISTICS_MAX_CANDIDATE_TURNS, SegmentTurn, extractionSystem, logisticsTurnSystem, logisticsTurnUser, scriptedTurn,
} from '@/lib/screen/logistics/prompts'
import { computeVerdicts, sanitizeExtraction } from '@/lib/screen/logistics/result'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ── Logistics / filtering segment (Screen-scoped) ──────────────────────────
// Candidate-facing (validated by interviewId, like warm-up / integrity).
//   action 'turn'     → { say, done }: the interviewer's next line
//   action 'finalize' → extract what was said, compute verdicts server-side,
//                       persist InterviewLogistics. Returns { ok } only —
//                       never the verdicts (comp is recruiter-only).
// Constraints are loaded server-side from the position; the comp band never
// reaches the model or the browser.

const FINAL_GRACE_MS = 10 * 60_000

function cleanTurns(raw: unknown): SegmentTurn[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(-24).flatMap((t) => {
    const o = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>
    const speaker = o.speaker === 'ai' || o.speaker === 'candidate' ? o.speaker : null
    const text = typeof o.text === 'string' ? o.text.trim().slice(0, 800) : ''
    return speaker && text ? [{ speaker, text }] : []
  })
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const m = text.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const interviewId = typeof body.interviewId === 'string' ? body.interviewId : ''
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { status: true, isDemo: true, completedAt: true, position: { select: { logistics: true } } },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    const live = interview.status === 'in_progress'
      || (interview.status === 'completed' && interview.completedAt && Date.now() - interview.completedAt.getTime() < FINAL_GRACE_MS)
    if (!live || interview.isDemo) return NextResponse.json({ error: 'not_available' }, { status: 409 })

    const cfg = readLogisticsConfig(interview.position.logistics)
    const turns = cleanTurns(body.turns)
    const candidateTurns = turns.filter((t) => t.speaker === 'candidate').length
    const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null

    // ── Finalize: extract → deterministic verdicts → persist ──
    if (body.action === 'finalize') {
      if (!candidateTurns) return NextResponse.json({ ok: true, stored: false })
      const defaultCurrency = cfg.comp?.currency ?? 'INR'
      let extracted = sanitizeExtraction(null)
      if (client) {
        try {
          const r = await client.messages.create({
            model: LIVE_INTERVIEW_MODEL, max_tokens: 500, temperature: 0,
            system: extractionSystem(cfg, defaultCurrency, new Date().toISOString().slice(0, 10)),
            messages: [{ role: 'user', content: logisticsTurnUser(turns, false).replace(/\n\nWRAP_NOW[\s\S]*$/, '') + '\n\nExtract the JSON now.' }],
          })
          const text = r.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
          extracted = sanitizeExtraction(parseJson(text))
        } catch (e) {
          console.error('[interview/logistics] extraction failed:', e instanceof Error ? e.message : e)
        }
      }
      const result = computeVerdicts(cfg, extracted, { completed: body.completed !== false })
      const data = {
        result: result as unknown as Prisma.InputJsonValue,
        constraints: cfg as unknown as Prisma.InputJsonValue,
        hardMismatch: result.hardMismatch,
      }
      await prisma.interviewLogistics.upsert({ where: { interviewId }, update: data, create: { interviewId, ...data } })
      return NextResponse.json({ ok: true, stored: true })
    }

    // ── Turn ──
    const wrapNow = body.wrapNow === true || candidateTurns >= LOGISTICS_MAX_CANDIDATE_TURNS
    if (!client) return NextResponse.json(scriptedTurn(cfg, candidateTurns, wrapNow))
    try {
      const r = await client.messages.create({
        model: LIVE_INTERVIEW_MODEL, max_tokens: 220, temperature: 0.6,
        system: logisticsTurnSystem(cfg),
        messages: [{ role: 'user', content: logisticsTurnUser(turns, wrapNow) }],
      })
      const text = r.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
      const j = parseJson(text)
      const say = typeof j?.say === 'string' ? j.say.trim() : ''
      if (!say) return NextResponse.json(scriptedTurn(cfg, candidateTurns, wrapNow))
      return NextResponse.json({ say, done: j?.done === true || wrapNow })
    } catch (e) {
      console.error('[interview/logistics] turn failed:', e instanceof Error ? e.message : e)
      return NextResponse.json(scriptedTurn(cfg, candidateTurns, wrapNow))
    }
  } catch (err) {
    console.error('[interview/logistics]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'logistics_failed' }, { status: 500 })
  }
}
