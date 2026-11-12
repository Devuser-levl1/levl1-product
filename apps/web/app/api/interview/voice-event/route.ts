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
const KINDS = new Set(['retry', 'reconnecting', 'recovered', 'gave_up', 'blocked', 'stt_error', 'brain_unavailable', 'barge_in'])

export async function POST(req: NextRequest) {
  const interviewId = verifyVoiceToken(req.headers.get('x-voice-token'))
  if (!interviewId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { kind?: unknown; detail?: unknown; attempt?: unknown }
  const kind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : null
  if (!kind) return NextResponse.json({ error: 'Unknown kind' }, { status: 400 })
  const detail = typeof body.detail === 'string' ? body.detail.slice(0, 200) : null
  const attempt = typeof body.attempt === 'number' ? body.attempt : null

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
