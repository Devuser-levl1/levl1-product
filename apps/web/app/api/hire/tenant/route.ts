import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const tenant = await prisma.hireTenant.findUnique({ where: { id: ctx.tenantId } })
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(tenant)
})

// Update company details during onboarding / settings (admins only).
export const PATCH = withHireAuth(async (req, ctx) => {
  if (ctx.role !== 'ADMIN') return NextResponse.json({ error: 'Only admins can edit company details' }, { status: 403 })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (body.type === 'AGENCY' || body.type === 'CORPORATE') data.type = body.type
  if (typeof body.domain === 'string') data.domain = body.domain.trim() || null
  const tenant = await prisma.hireTenant.update({ where: { id: ctx.tenantId }, data })
  return NextResponse.json(tenant)
})
