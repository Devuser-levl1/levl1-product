import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { DEFAULT_INVITE_BODY, DEFAULT_INVITE_SUBJECT, validateTemplate } from '@/lib/screen/recruiter/invite-template'

export const dynamic = 'force-dynamic'

// ── Org-wide candidate invite template (Screen-scoped) ─────────────────────
// GET → { subject, body, isCustom, default }. PUT { subject, body } saves;
// PUT { reset: true } reverts to the built-in default. Viewers can't edit.

export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const agency = await prisma.agency.findUnique({
    where: { id: access.session.agencyId }, select: { inviteEmailSubject: true, inviteEmailBody: true },
  })
  const isCustom = !!(agency?.inviteEmailSubject && agency.inviteEmailBody)
  return NextResponse.json({
    subject: isCustom ? agency!.inviteEmailSubject : DEFAULT_INVITE_SUBJECT,
    body: isCustom ? agency!.inviteEmailBody : DEFAULT_INVITE_BODY,
    isCustom,
    canEdit: access.canEdit,
    default: { subject: DEFAULT_INVITE_SUBJECT, body: DEFAULT_INVITE_BODY },
  })
}

export async function PUT(req: NextRequest) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const body = await req.json().catch(() => ({})) as { subject?: unknown; body?: unknown; reset?: unknown }

  if (body.reset === true) {
    await prisma.agency.update({ where: { id: access.session.agencyId }, data: { inviteEmailSubject: null, inviteEmailBody: null } })
    return NextResponse.json({ ok: true, isCustom: false, subject: DEFAULT_INVITE_SUBJECT, body: DEFAULT_INVITE_BODY })
  }
  const t = { subject: typeof body.subject === 'string' ? body.subject.trim() : '', body: typeof body.body === 'string' ? body.body.trim() : '' }
  const errors = validateTemplate(t)
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 })

  await prisma.agency.update({ where: { id: access.session.agencyId }, data: { inviteEmailSubject: t.subject, inviteEmailBody: t.body } })
  return NextResponse.json({ ok: true, isCustom: true, ...t })
}
