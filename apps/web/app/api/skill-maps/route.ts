import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { isRoleKey, sanitizeSkillMap } from '@/lib/screen/taskbank/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const rows = await prisma.roleSkillMap.findMany({ where: { agencyId: access.session.agencyId }, orderBy: { role: 'asc' } })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  if (!isRoleKey(body.role)) return NextResponse.json({ error: 'Pick a role.' }, { status: 400 })
  const exists = await prisma.roleSkillMap.findFirst({ where: { agencyId: access.session.agencyId, role: body.role }, select: { id: true } })
  if (exists) return NextResponse.json({ error: 'A skill map for this role already exists — edit it instead.', id: exists.id }, { status: 409 })
  const row = await prisma.roleSkillMap.create({
    data: { agencyId: access.session.agencyId, role: body.role, title: typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 80) : body.role, skills: sanitizeSkillMap(body.skills) as unknown as Prisma.InputJsonValue },
  })
  return NextResponse.json(row, { status: 201 })
}
