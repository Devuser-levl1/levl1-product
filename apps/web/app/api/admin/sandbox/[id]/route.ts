import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { openArray, revealEvents } from '@/lib/screen/privacy/fields'
import { summarizeIntegrity } from '@/lib/screen/integrity/summary'
import { deleteSandboxRun, sandboxEnabled } from '@/lib/screen/sandbox/run'

export const dynamic = 'force-dynamic'

// One sandbox run, for review in the admin sandbox only: transcript, answers,
// logistics + culture-fit results, integrity summary and report status.
// Only rows with isSandbox=true are ever returned or deleted here.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req); if (denied) return denied
  if (!sandboxEnabled()) return NextResponse.json({ error: 'disabled' }, { status: 403 })
  const iv = await prisma.interview.findFirst({
    where: { id: params.id, isSandbox: true },
    include: { logistics: true, cultureFit: true, integrityEvents: { orderBy: { occurredAt: 'asc' } }, candidate: { include: { report: true } }, position: { select: { title: true, company: true } } },
  })
  if (!iv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    id: iv.id, status: iv.status, startedAt: iv.startedAt, completedAt: iv.completedAt, terminationReason: iv.terminationReason,
    config: iv.sandboxConfig, position: iv.position, candidate: { name: iv.candidate.name },
    transcript: openArray(iv.transcript), questionResponses: openArray(iv.questionResponses),
    logistics: iv.logistics ? { result: iv.logistics.result, hardMismatch: iv.logistics.hardMismatch } : null,
    cultureFit: iv.cultureFit ? { fitScore: iv.cultureFit.fitScore, summary: iv.cultureFit.summary } : null,
    integrity: summarizeIntegrity(revealEvents(iv.integrityEvents.filter((e) => e.attempt === iv.attempt))),
    report: iv.candidate.report ? { overallScore: iv.candidate.report.overallScore, recommendation: iv.candidate.report.recommendation } : null,
    reportStatus: iv.reportStatus, reportError: iv.reportError,
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req); if (denied) return denied
  const iv = await prisma.interview.findFirst({ where: { id: params.id, isSandbox: true }, select: { id: true, candidateId: true, positionId: true } })
  if (!iv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await deleteSandboxRun(iv)
  return NextResponse.json({ ok: true })
}
