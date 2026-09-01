import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { buildResumeProposal } from '@/lib/hire/agent/resume-intake'
import { approveProposal } from '@/lib/hire/agent/approvals'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Verify the attachment belongs to a message in THIS recruiter's mailbox.
async function ownedAttachment(userId: string, tenantId: string, messageId: string, attId: string) {
  const att = await prisma.mailboxAttachment.findFirst({ where: { id: attId, messageId, tenantId } })
  if (!att) return null
  const msg = await prisma.mailboxMessage.findFirst({ where: { id: messageId, tenantId }, select: { connectionId: true, fromAddr: true, fromName: true } })
  if (!msg) return null
  const conn = await prisma.mailboxConnection.findFirst({ where: { id: msg.connectionId, userId, tenantId }, select: { id: true } })
  return conn ? { att, msg } : null
}

// GET — download the attachment bytes (tenant + ownership scoped).
export const GET = withHireAuth(async (_req, ctx, params) => {
  const owned = await ownedAttachment(ctx.userId, ctx.tenantId, params.id, params.attId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const bytes = Buffer.from(owned.att.contentBase64, 'base64')
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': owned.att.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${owned.att.filename.replace(/["\\]/g, '')}"`,
      'Content-Length': String(bytes.length),
    },
  })
})

// POST — add a résumé attachment to a job (or the talent pool), reusing the
// existing parse → dedupe → create → score → pipeline flow (incl. OCR for image
// PDFs). Body: { jobId?: string }. Omit jobId to add to the talent pool.
export const POST = withHireAuth(async (req, ctx, params) => {
  const owned = await ownedAttachment(ctx.userId, ctx.tenantId, params.id, params.attId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!owned.att.isResume) return NextResponse.json({ error: 'This attachment is not a résumé.' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const jobId = body.jobId ? String(body.jobId) : null
  if (jobId) {
    const job = await prisma.hireJob.findFirst({ where: { id: jobId, tenantId: ctx.tenantId }, select: { id: true } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Build a résumé proposal for this attachment, then approve it immediately with
  // the recruiter's choice — the same vetted, audited tool chain the agent uses.
  const proposalId = await buildResumeProposal({
    tenantId: ctx.tenantId,
    attachmentId: owned.att.id,
    messageId: params.id,
    fromName: owned.msg.fromName,
    fromAddr: owned.msg.fromAddr,
    assigneeUserId: ctx.userId,
  })
  if (!proposalId) return NextResponse.json({ error: "Couldn't read this résumé — the file may be corrupt or empty." }, { status: 422 })

  const me = await prisma.hireUser.findFirst({ where: { id: ctx.userId, tenantId: ctx.tenantId }, select: { name: true, email: true } })
  const chosen = jobId ? { kind: 'job', jobId } : { kind: 'talent_pool' }
  const result = await approveProposal(ctx.tenantId, proposalId, { userId: ctx.userId, role: ctx.role, approvedByName: me?.name || me?.email || 'a teammate' }, chosen)
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Could not add the résumé.' }, { status: 400 })

  // Link the source email to the created candidate's job, mark it handled.
  const candidateId = (result.result?.candidateId as string) ?? null
  await prisma.mailboxMessage.update({ where: { id: params.id }, data: { status: 'drafted', ...(jobId ? { createdPositionId: jobId } : {}) } }).catch(() => {})

  return NextResponse.json({ ok: true, summary: result.summary, candidateId, jobId })
})
