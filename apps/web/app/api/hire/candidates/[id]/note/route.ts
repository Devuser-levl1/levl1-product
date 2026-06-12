import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (req, ctx, params) => {
  // Verify the candidate belongs to this tenant before noting.
  const candidate = await prisma.hireCandidate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, select: { id: true } })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { note } = await req.json()
  if (!note || !String(note).trim()) return NextResponse.json({ error: 'Note text required' }, { status: 400 })

  const activity = await prisma.hireCandidateActivity.create({
    data: { candidateId: candidate.id, type: 'note', note: String(note), userId: ctx.userId },
  })
  return NextResponse.json(activity, { status: 201 })
})
