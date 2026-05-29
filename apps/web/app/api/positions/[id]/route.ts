import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const position = await prisma.position.findUnique({
      where: { id: params.id },
      include: {
        questionSet: true,
        candidates: true,
        positionReport: true,
        interviews: true,
      },
    })
    if (!position) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(position)
  } catch (err) {
    console.error('GET /api/positions/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch position' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const position = await prisma.position.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(position)
  } catch (err) {
    console.error('PATCH /api/positions/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
  }
}
