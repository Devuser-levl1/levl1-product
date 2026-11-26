import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { LIVE_INTERVIEW_MODEL } from '@/lib/screen/interview/model'
import { readLogisticsConfig } from '@/lib/screen/logistics/config'
import {
  SegmentTurn, extractionSystem, logisticsBudget, logisticsTurnSystem, logisticsTurnUser, scriptedTurn,
} from '@/lib/screen/logistics/prompts'
import { sanitizeKnockouts } from '@/lib/screen/position-config'
import { resolveInterviewerVoice } from '@/lib/screen/interviewer-voice'
import { computeVerdicts, sanitizeExtraction } from '@/lib/screen/logistics/result'
import { describeTopics, inferTopic, isRepeat, nextUncovered, scriptedForTopic, skipAnsweredKnockouts, topicState, type LogisticsTopic } from '@/lib/screen/logistics/topics'
import { sanitizeFacts, mergeFacts, factsBlock, sameLocation, asksRelocation, type CandidateFacts } from '@/lib/screen/session/facts'
import { oneQuestion } from '@/lib/screen/interview/single-question'

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
    const topic = typeof o.topic === 'string' && /^(location|notice|comp|workauth|close|knockout:[\w-]{1,40})$/.test(o.topic) ? o.topic : undefined
    return speaker && text ? [{ speaker, text, ...(topic ? { topic } : {}) }] : []
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
      select: { status: true, isDemo: true, isSandbox: true, completedAt: true, position: { select: { logistics: true, knockoutQuestions: true, voiceAccent: true, agency: { select: { voiceAccent: true } } } } },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    const live = interview.status === 'in_progress'
      || (interview.status === 'completed' && interview.completedAt && Date.now() - interview.completedAt.getTime() < FINAL_GRACE_MS)
    // Demo runs skip logistics; sandbox runs exercise the production flow.
    if (!live || (interview.isDemo && !interview.isSandbox)) return NextResponse.json({ error: 'not_available' }, { status: 409 })

    const cfg = readLogisticsConfig(interview.position.logistics)
    // Recruiter knockout questions (#14) — asked verbatim at the end of the
    // segment; answers are surfaced in the report, never used to auto-reject.
    const knockouts = sanitizeKnockouts(interview.position.knockoutQuestions)
    const budget = logisticsBudget(knockouts.length)
    const turns = cleanTurns(body.turns)
    const candidateTurns = turns.filter((t) => t.speaker === 'candidate').length
    // Running candidate facts (warm-up → logistics → Q&A) + warm-up lines for context.
    let facts: CandidateFacts = sanitizeFacts(body.facts)
    const earlier = (Array.isArray(body.earlier) ? body.earlier : []).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 400)).slice(-4)
    const skippedIn = (body.skipped && typeof body.skipped === 'object' ? body.skipped : {}) as Record<string, unknown>
    const skippedPrev: Record<string, string> = Object.fromEntries(Object.entries(skippedIn).filter(([k, v]) => typeof v === 'string' && /^[\w-]{1,40}$/.test(k)).map(([k, v]) => [k, (v as string).slice(0, 200)]))
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
            system: extractionSystem(cfg, defaultCurrency, new Date().toISOString().slice(0, 10), knockouts),
            messages: [{ role: 'user', content: logisticsTurnUser(turns, false, undefined, undefined, earlier).replace(/\n\nWRAP_NOW[\s\S]*$/, '') +
              `\n\n${factsBlock(facts)}` +
              (Object.keys(skippedPrev).length ? `\nHiring-team questions answered from facts stated earlier (not asked aloud): ${Object.entries(skippedPrev).map(([id, a]) => `${id}: ${a}`).join('; ')}. Judge their verdicts from these.` : '') +
              '\n\nExtract the JSON now.' }],
          })
          const text = r.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
          extracted = sanitizeExtraction(parseJson(text))
        } catch (e) {
          console.error('[interview/logistics] extraction failed:', e instanceof Error ? e.message : e)
        }
      }
      const result = computeVerdicts(cfg, extracted, { completed: body.completed !== false, knockouts })
      const data = {
        result: result as unknown as Prisma.InputJsonValue,
        constraints: cfg as unknown as Prisma.InputJsonValue,
        hardMismatch: result.hardMismatch,
      }
      await prisma.interviewLogistics.upsert({ where: { interviewId }, update: data, create: { interviewId, ...data } })
      return NextResponse.json({ ok: true, stored: true })
    }

    // ── Turn ──
    const wrapNow = body.wrapNow === true || candidateTurns >= budget.maxReplies
    // Fixpack 6 #4: deterministic topic tracking — no topic is ever re-asked.
    // Known facts can already answer a hiring-team question → skip it (never read it out).
    const skips = skipAnsweredKnockouts(topicState(turns, knockouts), knockouts, facts, cfg.location, skippedPrev)
    const state = skips.state
    const next = nextUncovered(state, knockouts)
    const alreadyThere = sameLocation(cfg.location, facts.location) === true
    // Acks only for questions skipped THIS turn (earlier skips were acknowledged then).
    const ackPrefix = skips.acks.join(' ')
    const closeTurn = { say: `Thanks — I've noted all of that for the team.`, done: true, topic: 'close' as LogisticsTopic }
    // Guard every candidate line (model or scripted) against repeats.
    const guard = (rawSay: string, done: boolean, claimed?: unknown) => {
      if (done || wrapNow) return { say: rawSay, done: true, topic: 'close' as LogisticsTopic }
      // ONE question per turn (real-user bug: clubbed questions).
      let say = oneQuestion(rawSay).text
      // Never ask someone already in the job location to relocate there.
      if (alreadyThere && asksRelocation(say)) {
        console.warn(JSON.stringify({ evt: 'logistics_blocked_relocation', interviewId, location: facts.location }))
        const ack = `You're already in ${facts.location}, so relocation isn't a concern.`
        return next ? { say: `${ack} ${scriptedForTopic(next, cfg, knockouts, state).replace(/^Thanks\. /, '')}`, done: false, topic: next } : { say: `${ack} I've noted all of that for the team.`, done: true, topic: 'close' as LogisticsTopic }
      }
      if (ackPrefix && !say.includes(ackPrefix)) say = `${ackPrefix} ${say}`
      const topic = inferTopic(say, knockouts) ?? (typeof claimed === 'string' ? claimed as LogisticsTopic : null)
      if (topic && isRepeat(topic, state)) {
        console.warn('[interview/logistics] blocked repeat of topic', topic, '→', next ?? 'close')
        return next ? { say: scriptedForTopic(next, cfg, knockouts, state), done: false, topic: next } : closeTurn
      }
      return { say, done: false, topic: topic ?? next ?? undefined }
    }
    const scripted = () => {
      const s = scriptedTurn(cfg, candidateTurns, wrapNow, knockouts)
      return guard(s.say, s.done)
    }
    if (!client) return NextResponse.json({ ...scripted(), budgetMs: budget.maxMs, facts, skipped: skips.answers })
    try {
      const r = await client.messages.create({
        model: LIVE_INTERVIEW_MODEL, max_tokens: 220, temperature: 0.6,
        system: logisticsTurnSystem(cfg, knockouts, resolveInterviewerVoice(interview.position.voiceAccent, interview.position.agency?.voiceAccent).name),
        messages: [{ role: 'user', content: logisticsTurnUser(turns, wrapNow, {
          asked: describeTopics(state.asked, knockouts),
          next: next ? describeTopics([next], knockouts) : 'none — confirm and close (done=true)',
        }, facts, earlier) }],
      })
      const text = r.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
      const j = parseJson(text)
      // Facts the model extracted from the whole conversation so far (merged, never dropped).
      facts = mergeFacts(facts, sanitizeFacts(j?.facts))
      const say = typeof j?.say === 'string' ? j.say.trim() : ''
      if (!say) return NextResponse.json({ ...scripted(), budgetMs: budget.maxMs, facts, skipped: skips.answers })
      return NextResponse.json({ ...guard(say, j?.done === true, j?.topic), budgetMs: budget.maxMs, facts, skipped: skips.answers })
    } catch (e) {
      console.error('[interview/logistics] turn failed:', e instanceof Error ? e.message : e)
      return NextResponse.json({ ...scripted(), budgetMs: budget.maxMs, facts, skipped: skips.answers })
    }
  } catch (err) {
    console.error('[interview/logistics]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'logistics_failed' }, { status: 500 })
  }
}
