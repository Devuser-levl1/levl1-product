import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { candidateId: string } }) {
  try {
    const report = await prisma.report.findUnique({
      where: { candidateId: params.candidateId },
      include: {
        candidate: {
          include: { position: true },
        },
      },
    })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(report)
  } catch (err) {
    console.error('GET /api/reports/[candidateId] error:', err)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
