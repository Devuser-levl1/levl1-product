import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const positions = await prisma.position.findMany({
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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const position = await prisma.position.create({ data: body })
    return NextResponse.json(position, { status: 201 })
  } catch (err) {
    console.error('POST /api/positions error:', err)
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
  }
}
