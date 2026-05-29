import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
