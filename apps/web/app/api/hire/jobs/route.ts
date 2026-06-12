import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(jobs)
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  const job = await prisma.hireJob.create({
    data: {
      tenantId: ctx.tenantId,
      title: String(body.title ?? ''),
      description: String(body.description ?? ''),
      department: body.department ?? null,
      location: body.location ?? null,
      salaryMin: body.salaryMin ?? null,
      salaryMax: body.salaryMax ?? null,
      stages: body.stages ?? ['Sourced', 'Screening', 'Interview', 'Offer', 'Hired'],
      clientId: body.clientId ?? null,
    },
  })
  return NextResponse.json(job, { status: 201 })
})
