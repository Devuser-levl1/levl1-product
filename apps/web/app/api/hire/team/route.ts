import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// List team members for the tenant. (Invites are sent via /api/hire/auth/invite.)
export const GET = withHireAuth(async (_req, ctx) => {
  const users = await prisma.hireUser.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true, passwordHash: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(
    users.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
      status: u.passwordHash ? 'active' : 'invited',
    })),
  )
})
