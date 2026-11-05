import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sanitizeSkillMap } from '@/lib/screen/taskbank/types'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const m = await prisma.roleSkillMap.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, select: { id: true } })
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const row = await prisma.roleSkillMap.update({
    where: { id: m.id },
    data: {
      ...(typeof body.title === 'string' && body.title.trim() ? { title: body.title.trim().slice(0, 80) } : {}),
      ...(body.skills !== undefined ? { skills: sanitizeSkillMap(body.skills) as unknown as Prisma.InputJsonValue, isSample: false } : {}),
    },
  })
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const m = await prisma.roleSkillMap.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, select: { id: true } })
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.roleSkillMap.delete({ where: { id: m.id } })
  return NextResponse.json({ ok: true })
}
