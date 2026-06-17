import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const existing = await prisma.hireEmailTemplate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const data: Record<string, string> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.subject === 'string' && body.subject.trim()) data.subject = body.subject.trim()
  if (typeof body.body === 'string' && body.body.trim()) data.body = body.body.trim()
  const template = await prisma.hireEmailTemplate.update({ where: { id: existing.id }, data })
  return NextResponse.json(template)
})

export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const existing = await prisma.hireEmailTemplate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.hireEmailTemplate.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
})
