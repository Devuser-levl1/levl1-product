import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getConnector } from '@/lib/jobboards'
import { decryptJson } from '@/lib/jobboards/crypto'
import { checkAllowance, incrementUsage } from '@/lib/hire/usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST — pull candidates from selected boards into the pool (Sourcing Hub
// inbound). Deduped against existing candidates (email, else name) and against
// each other; auto-scored (against the job if one is chosen, else a baseline
// résumé summary). Tenant-scoped.
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const boards: string[] = Array.isArray(body.boards) ? body.boards.filter((b: unknown) => typeof b === 'string') : []
  const jobId = body.jobId ? String(body.jobId) : null
  if (boards.length === 0) return NextResponse.json({ error: 'Select at least one board to pull from' }, { status: 400 })

  // Validate optional job + its first stage.
  let firstStage = 'Sourced'
  if (jobId) {
    const job = await prisma.hireJob.findFirst({ where: { id: jobId, tenantId: ctx.tenantId }, select: { stages: true } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (Array.isArray(job.stages) && job.stages.length) firstStage = String((job.stages as string[])[0])
  }

  const tenantConns = await prisma.jobBoardConnector.findMany({ where: { tenantId: ctx.tenantId } })
  const connByBoard = new Map(tenantConns.map((c) => [c.board, c]))

  // Dedupe set seeded from existing candidates; grows as we import.
  const existing = await prisma.hireCandidate.findMany({ where: { tenantId: ctx.tenantId }, select: { email: true, name: true } })
  const emails = new Set(existing.map((c) => (c.email ?? '').toLowerCase()).filter(Boolean))
  const names = new Set(existing.map((c) => c.name.toLowerCase()))

  const { enqueue } = await import('@/lib/hire/jobs/queue')
  const perBoard: { board: string; label: string; pulled: number; imported: number; duplicates: number; note?: string }[] = []
  let limitHit = false

  for (const board of boards) {
    const connector = getConnector(board)
    if (!connector || !connector.pull) { perBoard.push({ board, label: connector?.label ?? board, pulled: 0, imported: 0, duplicates: 0, note: 'No inbound source yet' }); continue }

    const creds = connByBoard.get(board)?.credentials ? decryptJson<Record<string, unknown>>(connByBoard.get(board)!.credentials as string) ?? undefined : undefined
    let pulled
    try { pulled = await connector.pull(creds) } catch (e) { perBoard.push({ board, label: connector.label, pulled: 0, imported: 0, duplicates: 0, note: e instanceof Error ? e.message : 'Pull failed' }); continue }

    let imported = 0, duplicates = 0
    for (const cand of pulled) {
      const email = (cand.email ?? '').toLowerCase()
      const isDup = email ? emails.has(email) : names.has(cand.name.toLowerCase())
      if (isDup) { duplicates++; continue }

      const allow = await checkAllowance(ctx.tenantId, 'candidate')
      if (!allow.allowed) { limitHit = true; break }

      const created = await prisma.hireCandidate.create({
        data: {
          tenantId: ctx.tenantId,
          jobId: jobId ?? null,
          name: cand.name,
          email: email || null,
          phone: cand.phone ?? null,
          currentTitle: cand.title ?? null,
          resumeText: cand.resumeText ?? null,
          source: connector.label,
          currentStage: jobId ? firstStage : 'Sourced',
        },
      })
      await prisma.hireCandidateActivity.create({ data: { candidateId: created.id, type: 'note', note: `Imported from ${connector.label} via Sourcing Hub`, userId: ctx.userId } })
      await incrementUsage(ctx.tenantId, 'candidate')
      // Auto-score: against the job if chosen, else a baseline résumé summary.
      if (created.resumeText) {
        await enqueue(jobId ? 'hire-score-candidate' : 'hire-baseline-summary', { candidateId: created.id }).catch(() => {})
      }
      if (email) emails.add(email)
      names.add(cand.name.toLowerCase())
      imported++
    }
    perBoard.push({ board, label: connector.label, pulled: pulled.length, imported, duplicates, ...(limitHit ? { note: 'Monthly candidate limit reached' } : {}) })
    if (limitHit) break
  }

  const totals = perBoard.reduce((a, b) => ({ pulled: a.pulled + b.pulled, imported: a.imported + b.imported, duplicates: a.duplicates + b.duplicates }), { pulled: 0, imported: 0, duplicates: 0 })
  console.log('[hire/sourcing/import] tenant=%s imported=%d duplicates=%d', ctx.tenantId, totals.imported, totals.duplicates)
  return NextResponse.json({ perBoard, totals })
})
