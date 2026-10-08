import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { resolveTemplate, validateTemplate } from '@/lib/screen/recruiter/invite-template'

export const dynamic = 'force-dynamic'

// ── Per-position invite template override (Screen-scoped) ──────────────────
// GET → the effective template + where it comes from (position | agency |
// default). PUT { subject, body } sets the override; PUT { reset: true } clears
// it so the position falls back to the agency template.

async function load(id: string, agencyId: string) {
  return prisma.position.findFirst({
    where: { id, agencyId },
    select: { id: true, inviteEmailSubject: true, inviteEmailBody: true, agency: { select: { inviteEmailSubject: true, inviteEmailBody: true } } },
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const pos = await load(params.id, access.session.agencyId)
  if (!pos) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const effective = resolveTemplate(pos, pos.agency)
  const inherited = resolveTemplate(null, pos.agency)
  return NextResponse.json({ ...effective, inherited, canEdit: access.canEdit })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const pos = await load(params.id, access.session.agencyId)
  if (!pos) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({})) as { subject?: unknown; body?: unknown; reset?: unknown }

  if (body.reset === true) {
    await prisma.position.update({ where: { id: pos.id }, data: { inviteEmailSubject: null, inviteEmailBody: null } })
    return NextResponse.json({ ok: true, ...resolveTemplate(null, pos.agency) })
  }
  const t = { subject: typeof body.subject === 'string' ? body.subject.trim() : '', body: typeof body.body === 'string' ? body.body.trim() : '' }
  const errors = validateTemplate(t)
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 })
  await prisma.position.update({ where: { id: pos.id }, data: { inviteEmailSubject: t.subject, inviteEmailBody: t.body } })
  return NextResponse.json({ ok: true, ...t, source: 'position' })
}
