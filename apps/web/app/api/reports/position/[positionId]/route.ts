import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { positionId: string } }) {
  try {
    const report = await prisma.positionReport.findUnique({
      where: { positionId: params.positionId },
      include: { position: true },
    })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(report)
  } catch (err) {
    console.error('GET /api/reports/position/[positionId] error:', err)
    return NextResponse.json({ error: 'Failed to fetch position report' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { positionId: string } }) {
  try {
    const body = await req.json()
    const report = await prisma.positionReport.upsert({
      where: { positionId: params.positionId },
      update: body,
      create: { ...body, positionId: params.positionId },
    })
    return NextResponse.json(report, { status: 201 })
  } catch (err) {
    console.error('POST /api/reports/position/[positionId] error:', err)
    return NextResponse.json({ error: 'Failed to save position report' }, { status: 500 })
  }
}
