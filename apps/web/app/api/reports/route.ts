import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Returns every report that belongs to the authenticated agency.
export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req as never)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const reports = await prisma.report.findMany({
      where: { candidate: { position: { agencyId: session.agencyId } } },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            interview: { select: { id: true } },
            position: { select: { id: true, title: true, company: true } },
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
    })
    return NextResponse.json(reports)
  } catch (err) {
    console.error('GET /api/reports error:', err)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { candidateId, ...data } = body
    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId required' }, { status: 400 })
    }
    const report = await prisma.report.upsert({
      where: { candidateId },
      update: data,
      create: { ...data, candidateId },
    })
    return NextResponse.json(report, { status: 201 })
  } catch (err) {
    console.error('POST /api/reports error:', err)
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
  }
}
