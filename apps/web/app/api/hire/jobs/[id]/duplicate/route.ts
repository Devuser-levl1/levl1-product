import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (_req, ctx, params) => {
  const src = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const copy = await prisma.hireJob.create({
    data: {
      tenantId: ctx.tenantId,
      title: `Copy of ${src.title}`,
      description: src.description,
      department: src.department,
      location: src.location,
      salaryMin: src.salaryMin,
      salaryMax: src.salaryMax,
      stages: src.stages as Prisma.InputJsonValue,
      status: 'ACTIVE',
      clientId: src.clientId,
    },
  })
  return NextResponse.json(copy, { status: 201 })
})
