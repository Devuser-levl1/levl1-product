import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/hire/permissions'

export const dynamic = 'force-dynamic'

// GET — tenant business-type (and name) for the settings card.
export const GET = withHireAuth(async (_req, ctx) => {
  const tenant = await prisma.hireTenant.findUnique({
    where: { id: ctx.tenantId },
    select: { id: true, name: true, businessType: true },
  })
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ tenant })
})

// PATCH — change the tenant's business type. Admin-only (settingsAdmin).
export const PATCH = withHireAuth(async (req, ctx) => {
  if (!can(ctx.role, 'settingsAdmin')) {
    return NextResponse.json({ error: 'Only an admin can change the business type.' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const businessType = body.businessType
  if (businessType !== 'AGENCY' && businessType !== 'ENTERPRISE') {
    return NextResponse.json({ error: 'businessType must be AGENCY or ENTERPRISE.' }, { status: 400 })
  }
  const tenant = await prisma.hireTenant.update({
    where: { id: ctx.tenantId },
    data: { businessType },
    select: { id: true, name: true, businessType: true },
  })
  return NextResponse.json({ ok: true, tenant })
})
