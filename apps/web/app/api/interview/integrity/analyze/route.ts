import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { detectLatencyAnomaly } from '@/lib/screen/integrity/latency'
import { analyzePaste } from '@/lib/screen/integrity/paste'
import { analyzeAiAssist } from '@/lib/screen/integrity/ai-assist'
import { analyzeCadence } from '@/lib/screen/integrity/cadence'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── T2 content-analysis endpoint (Build 02) ────────────────────────────────
// Runs the answer-content integrity signals for one answer and persists any
// resulting flags as InterviewIntegrityEvent rows (evidence-linked via meta).
// Candidate-facing during the live interview (validated by interviewId, like
// the verification + integrity routes). Only the text needed for analysis is
// sent to Claude — no raw video, no clipboard contents.

const BLUR_LOOKBACK_MS = 30_000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const interviewId = typeof body.interviewId === 'string' ? body.interviewId : ''
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

    // Resolve interview + the per-tier AI-assist cost toggle (Position.aiAssistCheck).
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, position: { select: { aiAssistCheck: true } }, candidate: { select: { currentTitle: true } } },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const answer = typeof body.answer === 'string' ? body.answer : ''
    const now = Date.now()

    // Correlate with Build-01 focus events: did the candidate leave the window
    // just before answering? Strengthens latency/paste signals.
    const recentBlur = await prisma.interviewIntegrityEvent.findFirst({
      where: { interviewId, type: { in: ['tab_switch', 'window_blur'] }, occurredAt: { gte: new Date(now - BLUR_LOOKBACK_MS) } },
      orderBy: { occurredAt: 'desc' }, select: { occurredAt: true },
    })
    const precedingBlurMs = recentBlur ? now - recentBlur.occurredAt.getTime() : null

    const latencyIn = body.latency ?? {}
    const pasteIn = body.paste ?? {}

    // Cheap heuristics — always on.
    const latencyFlag = detectLatencyAnomaly({
      questionDifficulty: body.questionDifficulty ?? null,
      timeToFirstKeystrokeMs: num(latencyIn.timeToFirstKeystrokeMs),
      idleBeforeAnswerMs: num(latencyIn.idleBeforeAnswerMs),
      answerLength: answer.length,
      precedingBlurMs,
    })
    const pasteFlag = analyzePaste({
      largestPasteChars: num(pasteIn.largestPasteChars),
      totalPastedChars: num(pasteIn.totalPastedChars),
      pasteCount: num(pasteIn.pasteCount),
      typedChars: num(pasteIn.typedChars),
      answerLength: answer.length,
      precedingBlurMs,
    })

    // AI-assist content check — the cost lever (skipped when the tier disables it).
    const aiAssistEnabled = (interview.position?.aiAssistCheck ?? true) && process.env.SCREEN_AI_ASSIST_DISABLED !== 'true'
    const aiFlag = await analyzeAiAssist(
      { answer, baseline: typeof body.baseline === 'string' ? body.baseline : undefined, questionText: body.questionText, statedExperience: interview.candidate?.currentTitle ?? null },
      { enabled: aiAssistEnabled },
    )

    // Read-aloud cadence — cheap text heuristic, spoken answers only (corroborating).
    const cadenceFlag = analyzeCadence({ answer, spoken: body.spoken === true })

    const flags = [latencyFlag, pasteFlag, aiFlag, cadenceFlag].filter((f): f is NonNullable<typeof f> => f !== null)
    if (flags.length > 0) {
      // Carry the question context on EVERY content flag so the report can correlate
      // it to the answer window ("…while answering Q3"), not just the AI-assist flag.
      const qCtx = {
        ...(body.questionId ? { questionId: String(body.questionId) } : {}),
        ...(typeof body.questionText === 'string' ? { questionText: body.questionText } : {}),
      }
      await prisma.interviewIntegrityEvent.createMany({
        data: flags.map((f) => ({
          interviewId, type: f.type, confidence: f.confidence, detail: f.rationale,
          meta: { ...f.meta, ...qCtx } as Prisma.InputJsonValue,
        })),
      })
    }

    return NextResponse.json({
      aiAssistEnabled,
      flags: flags.map((f) => ({ type: f.type, confidence: f.confidence, rationale: f.rationale, meta: f.meta })),
    })
  } catch (err) {
    console.error('[interview/integrity/analyze] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

function num(v: unknown): number | undefined { return typeof v === 'number' && !isNaN(v) ? v : undefined }
