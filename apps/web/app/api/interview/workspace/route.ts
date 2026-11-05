import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { loadWorkspaceSession, MAX_CODE_CHARS } from '@/lib/screen/workspace/session'
import { publicTask, isWorkspaceLanguage } from '@/lib/screen/workspace/task'
import { mergeEvents, sanitizeEvents, type TimelineEvent } from '@/lib/screen/workspace/timeline'
import { openArray, openText, sealJson, sealText } from '@/lib/screen/privacy/fields'

export const dynamic = 'force-dynamic'

// ── Candidate workspace (Observe & Defend) ─────────────────────────────────
// GET  ?interviewId= → { mode, task (public — no hidden tests), saved }  — restore after refresh
// POST { interviewId, code, language, events[], submitted? }             — continuous autosave
// Code + timeline are stored encrypted. The client serializes saves (one in
// flight), so the read-merge-write of the timeline doesn't race.

export async function GET(req: NextRequest) {
  const interviewId = new URL(req.url).searchParams.get('interviewId')?.trim() ?? ''
  const s = await loadWorkspaceSession(interviewId)
  if (!s) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  if (!s.task) return NextResponse.json({ mode: s.mode, task: null, saved: null })
  const row = await prisma.interviewWorkSample.findUnique({ where: { interviewId }, select: { code: true, language: true, updatedAt: true, lastTests: true, submittedAt: true, timeline: true } })
  // Continue the timeline clock after a refresh (events are relative ms).
  const tl = row ? openArray<TimelineEvent>(row.timeline) : []
  return NextResponse.json({
    mode: s.mode,
    task: publicTask(s.task),
    resumeMs: tl.length ? tl[tl.length - 1].t + 1000 : 0,
    saved: row ? { code: openText(row.code) ?? '', language: row.language, savedAt: row.updatedAt.toISOString(), lastTests: row.lastTests ?? null, submitted: !!row.submittedAt } : null,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const interviewId = typeof body.interviewId === 'string' ? body.interviewId.trim() : ''
    const s = await loadWorkspaceSession(interviewId)
    if (!s) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    if (!s.task) return NextResponse.json({ error: 'no_workspace' }, { status: 409 })
    if (!s.live) return NextResponse.json({ error: 'not_live' }, { status: 409 })

    const code = typeof body.code === 'string' ? body.code : null
    if (code !== null && code.length > MAX_CODE_CHARS) return NextResponse.json({ error: 'code_too_large' }, { status: 413 })
    const language = isWorkspaceLanguage(body.language) ? body.language : s.task.language
    const incoming = sanitizeEvents(body.events)

    const existing = await prisma.interviewWorkSample.findUnique({ where: { interviewId }, select: { timeline: true } })
    const timeline = mergeEvents(existing ? openArray<TimelineEvent>(existing.timeline) : [], incoming)
    const data = {
      language,
      ...(code !== null ? { code: sealText(code) } : {}),
      timeline: sealJson(timeline),
      ...(body.submitted === true ? { submittedAt: new Date() } : {}),
    }
    await prisma.interviewWorkSample.upsert({
      where: { interviewId },
      update: data,
      create: { interviewId, task: s.task as unknown as Prisma.InputJsonValue, ...data },
    })
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[workspace/save]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }
}
