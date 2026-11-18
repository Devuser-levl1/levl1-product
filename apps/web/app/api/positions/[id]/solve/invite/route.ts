import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sanitizeTask } from '@/lib/screen/workspace/task'
import { sanitizeSolveConfig, allowedLanguages } from '@/lib/screen/solve/config'
import { newToken, hashToken } from '@/lib/screen/solve/session'
import { solveInviteHtml, solveInviteSubject } from '@/lib/screen/solve/email'
import { recordStageUsage } from '@/lib/screen/solve/usage'
import { sendEmail, agencyFromAddress } from '@/lib/emailService'
import { appUrl } from '@/lib/screen/app-url'
import { checkInterviewAllowance } from '@/lib/checkUsage'

export const dynamic = 'force-dynamic'

// POST { candidateIds: string[], sendEmail?: boolean } → { sent: [{ candidateId, url, emailed }], skipped: [...] }
// Assigns the take-home to candidates of THIS position. Re-inviting a candidate
// who hasn't started rotates their link (the old one stops working); a started
// or submitted take-home is never reset. The link is returned once (copy) and emailed.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const agencyId = access.session.agencyId
  const body = await req.json().catch(() => ({})) as { candidateIds?: unknown; sendEmail?: unknown }
  const ids = Array.isArray(body.candidateIds) ? Array.from(new Set(body.candidateIds.filter((x): x is string => typeof x === 'string'))).slice(0, 100) : []
  if (!ids.length) return NextResponse.json({ error: 'Pick at least one candidate.' }, { status: 400 })

  const pos = await prisma.position.findFirst({
    where: { id: params.id, agencyId },
    select: {
      id: true, title: true, company: true, isDemo: true,
      solveAssignment: { select: { id: true, enabled: true, task: true, config: true } },
      agency: { select: { name: true, senderName: true, senderEmail: true, resendDomainVerified: true } },
    },
  })
  if (!pos) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const a = pos.solveAssignment
  if (!a?.enabled) return NextResponse.json({ error: 'Turn on the take-home for this position first.' }, { status: 409 })
  const task = sanitizeTask(a.task)
  if (!task) return NextResponse.json({ error: 'Choose a task first.' }, { status: 409 })
  if (!task.approved) return NextResponse.json({ error: 'Approve the task before sending it. An unreviewed AI draft is never sent to candidates.' }, { status: 409 })
  // Solve doesn't use the interview allowance; only an ended trial blocks it.
  const allowance = await checkInterviewAllowance(agencyId)
  if (allowance.reason === 'trial_expired' || allowance.reason === 'agency_not_found') return NextResponse.json({ error: allowance.message ?? 'Your plan does not allow this.' }, { status: 402 })

  const cfg = sanitizeSolveConfig(a.config)
  const snapshotTask = { ...task, languages: allowedLanguages(task.languages, cfg) }
  const candidates = await prisma.candidate.findMany({
    where: { id: { in: ids }, positionId: pos.id },
    select: { id: true, name: true, email: true, isDemo: true, solveSubmission: { select: { id: true, status: true } } },
  })
  const sent: { candidateId: string; name: string; url: string; emailed: boolean }[] = []
  const skipped: { candidateId: string; name: string; reason: string }[] = []
  const now = Date.now()
  const expiresAt = new Date(now + cfg.windowDays * 86_400_000)

  for (const c of candidates) {
    const existing = c.solveSubmission
    if (existing && !['invited', 'expired'].includes(existing.status)) { skipped.push({ candidateId: c.id, name: c.name, reason: 'Already started — the take-home is never reset' }); continue }
    const token = newToken()
    const data = {
      tokenHash: hashToken(token), status: 'invited', task: snapshotTask as unknown as Prisma.InputJsonValue, config: cfg as unknown as Prisma.InputJsonValue,
      invitedAt: new Date(now), invitedBy: access.session.email, expiresAt, language: snapshotTask.language,
    }
    const sub = existing
      ? await prisma.solveSubmission.update({ where: { id: existing.id }, data: { ...data, assignmentId: a.id }, select: { id: true } })
      : await prisma.solveSubmission.create({ data: { ...data, assignmentId: a.id, positionId: pos.id, candidateId: c.id, agencyId, isDemo: pos.isDemo || c.isDemo }, select: { id: true } })
    const url = `${appUrl()}/solve/${token}`
    let emailed = false
    if (body.sendEmail !== false && c.email) {
      try {
        const input = { candidateName: c.name, positionTitle: pos.title, company: pos.company, orgName: pos.agency?.senderName || pos.agency?.name || pos.company, url, expiresAt, durationMinutes: cfg.durationMinutes, defenseRequired: cfg.defenseRequired }
        await sendEmail({ to: c.email, subject: solveInviteSubject(input), html: solveInviteHtml(input), ...(pos.agency ? { from: agencyFromAddress(pos.agency) } : {}) })
        emailed = true
      } catch (e) {
        console.warn('[solve/invite] email failed', JSON.stringify({ submissionId: sub.id, err: e instanceof Error ? e.message : String(e) }))
      }
    }
    await recordStageUsage({ agencyId, stage: 'solve', kind: 'solve_invite', refId: `${sub.id}:${now}`, isDemo: pos.isDemo || c.isDemo })
    sent.push({ candidateId: c.id, name: c.name, url, emailed })
  }
  for (const id of ids) if (!candidates.some((c) => c.id === id)) skipped.push({ candidateId: id, name: '', reason: 'Not a candidate for this position' })
  console.info(JSON.stringify({ evt: 'solve_invited', positionId: pos.id, sent: sent.length, skipped: skipped.length }))
  return NextResponse.json({ sent, skipped })
}
