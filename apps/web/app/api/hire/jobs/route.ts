import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULT_STAGES = ['Sourced', 'Screening', 'Interview', 'Technical Round', 'HR Round', 'Offer', 'Hired']

export const GET = withHireAuth(async (_req, ctx) => {
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      _count: { select: { candidates: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(jobs)
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  if (!body.title || !body.description) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
  }
  const stages = Array.isArray(body.stages) && body.stages.length >= 2 ? body.stages : DEFAULT_STAGES

  const job = await prisma.hireJob.create({
    data: {
      tenantId: ctx.tenantId,
      title: String(body.title),
      description: String(body.description),
      department: body.department ?? null,
      location: body.location ?? null,
      salaryMin: body.salaryMin != null ? Number(body.salaryMin) : null,
      salaryMax: body.salaryMax != null ? Number(body.salaryMax) : null,
      stages,
      status: 'ACTIVE',
      clientId: body.clientId || null,
    },
  })
  return NextResponse.json(job, { status: 201 })
})
