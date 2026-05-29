import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: params.id },
      include: {
        position: true,
        interview: true,
        report: true,
      },
    })
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(candidate)
  } catch (err) {
    console.error('GET /api/candidates/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch candidate' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const candidate = await prisma.candidate.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(candidate)
  } catch (err) {
    console.error('PATCH /api/candidates/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 })
  }
}
