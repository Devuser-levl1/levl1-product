import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (req, ctx) => {
  const jobId = req.nextUrl.searchParams.get('jobId') ?? undefined
  const candidates = await prisma.hireCandidate.findMany({
    where: { tenantId: ctx.tenantId, ...(jobId ? { jobId } : {}) },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(candidates)
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  const candidate = await prisma.hireCandidate.create({
    data: {
      tenantId: ctx.tenantId,
      jobId: body.jobId ?? null,
      name: String(body.name ?? ''),
      email: String(body.email ?? ''),
      phone: body.phone ?? null,
      resumeText: body.resumeText ?? null,
      ...(body.skills ? { skills: body.skills } : {}),
      source: body.source ?? null,
    },
  })
  return NextResponse.json(candidate, { status: 201 })
})
