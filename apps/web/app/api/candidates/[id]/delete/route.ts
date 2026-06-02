import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { reason } = await req.json()
    if (!reason?.trim()) return NextResponse.json({ error: 'Reason is required' }, { status: 400 })

    const candidate = await prisma.candidate.findUnique({
      where: { id: params.id },
      include: { position: { select: { agencyId: true } } },
    })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    if (candidate.position.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Deletion log first (before cascade)
    await prisma.deletionLog.create({
      data: {
        entityType: 'candidate',
        entityId:   candidate.id,
        entityName: candidate.name,
        deletedBy:  session.email,
        reason:     reason.trim(),
        agencyId:   session.agencyId,
      },
    })

    // Delete in FK-safe order
    await prisma.interviewToken.deleteMany({ where: { interview: { candidateId: candidate.id } } })
    await prisma.report.deleteMany({ where: { candidateId: candidate.id } })
    await prisma.interview.deleteMany({ where: { candidateId: candidate.id } })
    await prisma.candidate.delete({ where: { id: candidate.id } })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete candidate'
    console.error('[candidate/delete] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
