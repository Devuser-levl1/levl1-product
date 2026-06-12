import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const user = await prisma.hireUser.findFirst({
    where: { id: ctx.userId, tenantId: ctx.tenantId },
    include: { tenant: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant: {
      id: user.tenant.id, name: user.tenant.name, type: user.tenant.type,
      plan: user.tenant.plan, trialEndsAt: user.tenant.trialEndsAt, trialActive: user.tenant.trialActive,
    },
  })
})
