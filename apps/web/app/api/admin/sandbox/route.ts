import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { VOICE_OPTIONS, DEFAULT_VOICE_KEY } from '@/lib/voiceOptions'
import { SANDBOX_PRESETS, createSandboxRun, parseSandboxInput, sandboxEnabled } from '@/lib/screen/sandbox/run'

export const dynamic = 'force-dynamic'

// Interview Test Sandbox — admin only (platform admin cookie) and switchable
// off with INTERVIEW_SANDBOX_ENABLED=0.
//   GET  → recent sandbox runs + what a run can be based on
//   POST → create a run; the admin then opens /interview/<id> (the real room)
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied
  if (!sandboxEnabled()) return NextResponse.json({ enabled: false })
  const [runs, positions] = await Promise.all([
    prisma.interview.findMany({
      where: { isSandbox: true }, orderBy: { createdAt: 'desc' }, take: 30,
      select: { id: true, status: true, createdAt: true, completedAt: true, terminationReason: true, reportStatus: true, sandboxConfig: true, candidate: { select: { name: true, report: { select: { id: true } } } }, position: { select: { title: true } } },
    }),
    // Real roles with an approved question set (read-only source for a copy).
    prisma.position.findMany({
      where: { isDemo: false, questionSet: { isNot: null } }, orderBy: { updatedAt: 'desc' }, take: 60,
      select: { id: true, title: true, company: true, agency: { select: { name: true } } },
    }),
  ])
  return NextResponse.json({
    enabled: true,
    presets: SANDBOX_PRESETS,
    positions: positions.map((p) => ({ id: p.id, title: p.title, company: p.company, agency: p.agency?.name ?? '' })),
    voices: VOICE_OPTIONS.map((v) => ({ key: v.key, label: `${v.interviewerName} — ${v.accent}, ${v.gender}` })), defaultVoice: DEFAULT_VOICE_KEY,
    runs: runs.map((r) => ({
      id: r.id, status: r.status, createdAt: r.createdAt, completedAt: r.completedAt, terminationReason: r.terminationReason,
      label: (r.sandboxConfig as { label?: string } | null)?.label ?? r.position.title, candidate: r.candidate.name,
      reportReady: !!r.candidate.report, reportStatus: r.reportStatus,
    })),
  })
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied
  if (!sandboxEnabled()) return NextResponse.json({ error: 'The interview sandbox is disabled (INTERVIEW_SANDBOX_ENABLED=0).' }, { status: 403 })
  const input = parseSandboxInput(await req.json().catch(() => ({})))
  if ('error' in input) return NextResponse.json({ error: input.error }, { status: 400 })
  try {
    const run = await createSandboxRun(input, 'platform admin')
    return NextResponse.json({ ...run, url: `/interview/${run.interviewId}` })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not create the sandbox run'
    console.error('[admin/sandbox] create failed:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
