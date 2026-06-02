import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const approval = await prisma.approvalToken.findUnique({
      where:   { token: params.token },
      include: { position: { include: { agency: true } } },
    })
    if (!approval || approval.type !== 'client_jd') {
      return NextResponse.json({ error: 'Invalid JD approval link' }, { status: 404 })
    }
    if (approval.status !== 'pending') {
      return NextResponse.json({ alreadyDone: true, status: approval.status }, { status: 200 })
    }
    if (new Date() > approval.expiresAt) {
      return NextResponse.json({ error: 'This link has expired. Ask the recruiter to resend.' }, { status: 410 })
    }

    const pos = approval.position
    return NextResponse.json({
      positionTitle:   pos.title,
      company:         pos.company,
      department:      pos.department,
      experienceLevel: pos.experienceLevel,
      jdText:          pos.jdText ?? '',
      agencyName:      pos.agency?.name ?? 'Your recruiter',
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { decision, comments } = await req.json()

    const approval = await prisma.approvalToken.findUnique({
      where:   { token: params.token },
      include: { position: true },
    })
    if (!approval || approval.type !== 'client_jd') {
      return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
    }
    if (approval.status !== 'pending') return NextResponse.json({ error: 'Already submitted' }, { status: 400 })
    if (new Date() > approval.expiresAt) return NextResponse.json({ error: 'Link expired' }, { status: 410 })

    await prisma.approvalToken.update({
      where: { id: approval.id },
      data:  { status: decision, comments: comments ?? null, approvedAt: new Date() },
    })

    if (decision === 'approved') {
      await prisma.position.update({
        where: { id: approval.positionId },
        data:  { jdApprovedBy: approval.email, jdApprovedAt: new Date() },
      })
    }

    return NextResponse.json({ success: true, decision })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
