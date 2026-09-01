import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { sendHireEmail } from '@/lib/hire/email'
import { agencyFromAddress } from '@/lib/emailService'
import { logAudit } from '@/lib/hire/audit'
import { buildSummaryXlsx, resumeTextDoc, resolveColumns, safeFileBase, type SubmissionCandidate } from '@/lib/hire/submission'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CAND_SELECT = {
  id: true, name: true, email: true, phone: true, currentTitle: true, currentCompany: true,
  totalYears: true, skills: true, topSkills: true, aiScore: true, aiRecommendation: true,
  aiSummary: true, source: true, currentStage: true, resumeText: true, jobId: true,
}

// POST — submit selected candidates to a client contact: emails the contact an
// .xlsx summary (client's configured columns) + each candidate's résumé, logs
// it on every candidate + the client, and marks them submitted. BYOB-style send
// via Resend. Agency-only (Enterprise has no clients). Tenant-scoped.
export const POST = withHireAuth(async (req, ctx) => {
  if (ctx.businessType === 'ENTERPRISE') {
    return NextResponse.json({ error: 'Submitting to clients is an agency-only feature.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.from(new Set((Array.isArray(body.candidateIds) ? body.candidateIds : []).map((x: unknown) => String(x)).filter((s: string) => !!s)))
  if (ids.length === 0) return NextResponse.json({ error: 'Select at least one candidate.' }, { status: 400 })
  if (!body.clientId) return NextResponse.json({ error: 'Choose a client.' }, { status: 400 })

  const client = await prisma.hireClient.findFirst({
    where: { id: String(body.clientId), tenantId: ctx.tenantId },
    include: { contacts: { select: { id: true, name: true, email: true, emailOptOut: true } } },
  })
  if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 })

  // Resolve the recipient contact (by id, or an explicit email).
  let toEmail = ''
  let toName = ''
  if (body.contactId) {
    const c = client.contacts.find((x) => x.id === String(body.contactId))
    if (!c || !c.email) return NextResponse.json({ error: 'That contact has no email.' }, { status: 400 })
    if (c.emailOptOut) return NextResponse.json({ error: 'That contact has opted out of emails.' }, { status: 400 })
    toEmail = c.email; toName = c.name
  } else if (typeof body.contactEmail === 'string' && body.contactEmail.includes('@')) {
    toEmail = body.contactEmail.trim(); toName = String(body.contactName ?? '').trim()
  } else {
    return NextResponse.json({ error: 'Choose a contact or enter an email.' }, { status: 400 })
  }

  const subject = String(body.subject ?? '').trim()
  const bodyText = String(body.body ?? '').trim()
  if (!subject || !bodyText) return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 })

  const cands = await prisma.hireCandidate.findMany({ where: { id: { in: ids }, tenantId: ctx.tenantId }, select: CAND_SELECT })
  if (cands.length === 0) return NextResponse.json({ error: 'No candidates found.' }, { status: 404 })

  // Columns: per-send override → the client's saved template → default.
  const columns = resolveColumns(body.columns ?? client.submissionColumns)

  // Job-relative match scores (when the selected candidates are attached to a job).
  const jobPairs = cands.filter((c) => c.jobId).map((c) => ({ jobId: c.jobId as string, candidateId: c.id }))
  const matches = jobPairs.length
    ? await prisma.hireMatch.findMany({ where: { tenantId: ctx.tenantId, OR: jobPairs.map((p) => ({ jobId: p.jobId, candidateId: p.candidateId })) }, select: { jobId: true, candidateId: true, score: true } })
    : []
  const matchByCand = new Map(matches.map((m) => [m.candidateId, m.score]))

  const subCands: SubmissionCandidate[] = cands.map((c) => ({ ...c, matchScore: matchByCand.get(c.id) ?? c.aiScore }))

  // Build attachments: one .xlsx summary + one résumé (.txt) per candidate.
  const jobTitle = null
  const xlsx = await buildSummaryXlsx({ columns, candidates: subCands, clientName: client.name, jobTitle })
  const attachments = [
    { filename: `Candidates_${safeFileBase(client.name)}.xlsx`, content: xlsx.toString('base64'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ...subCands.map((c) => ({ filename: `${safeFileBase(c.name)}_Resume.txt`, content: Buffer.from(resumeTextDoc(c), 'utf8').toString('base64'), contentType: 'text/plain; charset=utf-8' })),
  ]

  const [tenant, user] = await Promise.all([
    prisma.hireTenant.findUnique({ where: { id: ctx.tenantId }, select: { name: true } }),
    prisma.hireUser.findFirst({ where: { id: ctx.userId, tenantId: ctx.tenantId }, select: { name: true, email: true } }),
  ])
  const from = agencyFromAddress({ name: tenant?.name ?? 'HirePilot' })
  const html = `<div style="font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#0F172A">${bodyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</div>`

  try {
    await sendHireEmail({ to: toEmail, from, replyTo: user?.email, subject, html, attachments })
  } catch (e) {
    console.error('[hire/submit-to-client] send failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Could not send — please try again.' }, { status: 502 })
  }

  // Log on every candidate timeline + mark submitted; log once on the client (audit).
  const now = new Date()
  const note = `Submitted to ${client.name}${toName ? ` (${toName})` : ''} <${toEmail}>`
  await prisma.$transaction([
    ...subCands.map((c) => prisma.hireCandidateActivity.create({ data: { candidateId: c.id, type: 'submitted_to_client', note, userId: ctx.userId } })),
    prisma.hireCandidate.updateMany({ where: { id: { in: subCands.map((c) => c.id) }, tenantId: ctx.tenantId }, data: { submittedToClientAt: now } }),
  ])
  await logAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId,
    action: 'candidates_submitted_to_client', targetType: 'client', targetId: client.id, targetName: client.name,
    meta: { candidateIds: subCands.map((c) => c.id), count: subCands.length, to: toEmail, columns },
  }).catch(() => {})

  return NextResponse.json({ ok: true, sentTo: toEmail, count: subCands.length, columns })
})
