import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: params.id },
      include: {
        candidate: true,
        position: true,
      },
    })
    if (!interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(interview)
  } catch (err) {
    console.error('GET /api/interviews/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch interview' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const interview = await prisma.interview.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(interview)
  } catch (err) {
    console.error('PATCH /api/interviews/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 })
  }
}
