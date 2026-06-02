import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    const positions = await prisma.position.findMany({
      where: session?.agencyId ? { agencyId: session.agencyId } : undefined,
      include: {
        questionSet: true,
        candidates: { select: { id: true, status: true, score: true } },
        _count: { select: { interviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(positions)
  } catch (err) {
    console.error('GET /api/positions error:', err)
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body     = await req.json()
    const session  = getSessionFromRequest(req)
    const agencyId = session?.agencyId ?? body.agencyId

    // Duplicate detection — same title + company for this agency, not closed/lost/won
    if (agencyId && body.title && body.company) {
      const existing = await prisma.position.findFirst({
        where: {
          agencyId,
          title:   { equals: body.title,   mode: 'insensitive' },
          company: { equals: body.company, mode: 'insensitive' },
          status:  { notIn: ['closed', 'lost', 'won'] },
        },
        select: { id: true, title: true, status: true },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'duplicate', message: `A position for "${body.title}" at "${body.company}" already exists.`, existingId: existing.id },
          { status: 409 },
        )
      }
    }

    const position = await prisma.position.create({
      data: { ...body, agencyId: agencyId ?? body.agencyId },
    })
    return NextResponse.json(position, { status: 201 })
  } catch (err) {
    console.error('POST /api/positions error:', err)
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
  }
}
