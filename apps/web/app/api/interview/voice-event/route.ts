import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyVoiceToken } from '@/lib/screen/interview/voice-token'

export const dynamic = 'force-dynamic'

// POST /api/interview/voice-event  (header x-voice-token)  { kind, detail? }
// The interview room reports interviewer-voice trouble here so it is VISIBLE:
//   • ops — a structured server log line per event (Render logs)
//   • recruiters — InterviewLiveState.voiceWarning / voiceIssues, surfaced as
//     a Control Room health reason while the interview is live.
// kind: retry | reconnecting | recovered | gave_up | blocked

const WARNING: Record<string, string | null> = {
  reconnecting: 'Interviewer voice reconnecting',
  gave_up: 'Interviewer voice unavailable — candidate reading questions on screen',
  blocked: 'Interviewer audio blocked by the browser — waiting for the candidate to tap',
  brain_unavailable: 'AI evaluator unavailable — answers are not being evaluated live (check Anthropic billing/status)',
  recovered: null,
}
// stt_error = live transcription (Scribe) failed — logged as an error; the room
// falls back to browser recognition and the Control Room flags 'webspeech'.
// brain_unavailable = evaluate-response degraded (e.g. Anthropic out of credits) — alert.
// barge_in = the candidate interrupted the interviewer (telemetry, info only).
// turn_timing = per-answer latency breakdown (telemetry, info only).
const KINDS = new Set(['retry', 'reconnecting', 'recovered', 'gave_up', 'blocked', 'stt_error', 'brain_unavailable', 'barge_in', 'turn_timing'])
const TIMING_KEYS = ['path', 'sttTurnEndMs', 'brainMs', 'brainDegraded', 'gapBeforeVoiceMs', 'ttsFirstAudioMs', 'ttsAttempts', 'totalMs'] as const

export async function POST(req: NextRequest) {
  const interviewId = verifyVoiceToken(req.headers.get('x-voice-token'))
  if (!interviewId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { kind?: unknown; detail?: unknown; attempt?: unknown; timing?: unknown }
  const kind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : null
  if (!kind) return NextResponse.json({ error: 'Unknown kind' }, { status: 400 })
  const detail = typeof body.detail === 'string' ? body.detail.slice(0, 200) : null
  const attempt = typeof body.attempt === 'number' ? body.attempt : null

  if (kind === 'turn_timing') {
    // Whitelisted numbers/booleans only — one line per answer: evt=turn_timing
    const t = (body.timing && typeof body.timing === 'object' ? body.timing : {}) as Record<string, unknown>
    const timing: Record<string, number | string | boolean | null> = {}
    for (const k of TIMING_KEYS) {
      const v = t[k]
      if (typeof v === 'number' && Number.isFinite(v)) timing[k] = Math.max(0, Math.min(600_000, Math.round(v)))
      else if (typeof v === 'boolean') timing[k] = v
      else if (k === 'path' && typeof v === 'string') timing[k] = v.slice(0, 12)
      else timing[k] = null
    }
    console.info(JSON.stringify({ evt: 'turn_timing', interviewId, ...timing }))
    return NextResponse.json({ ok: true })
  }

  const log = JSON.stringify({ evt: 'voice_event', kind, detail, attempt, interviewId })
  if (kind === 'recovered' || kind === 'barge_in') console.info(log); else if (kind === 'stt_error' || kind === 'gave_up' || kind === 'brain_unavailable') console.error(log); else console.warn(log)

  const now = new Date()
  const data = {
    ...(kind === 'retry' ? { voiceIssues: { increment: 1 }, lastVoiceIssueAt: now } : {}),
    ...(kind in WARNING ? { voiceWarning: WARNING[kind] } : {}),
  }
  if (Object.keys(data).length) {
    await prisma.interviewLiveState.upsert({
      where: { interviewId },
      update: data,
      create: { interviewId, voiceWarning: WARNING[kind] ?? null, voiceIssues: kind === 'retry' ? 1 : 0, lastVoiceIssueAt: kind === 'retry' ? now : null },
    }).catch((e) => console.error('[voice-event] persist failed:', e instanceof Error ? e.message : e))
  }
  return NextResponse.json({ ok: true })
}
