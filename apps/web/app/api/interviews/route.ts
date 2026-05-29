import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const interviews = await prisma.interview.findMany({
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        position: { select: { id: true, title: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(interviews)
  } catch (err) {
    console.error('GET /api/interviews error:', err)
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const interview = await prisma.interview.create({ data: body })
    return NextResponse.json(interview, { status: 201 })
  } catch (err) {
    console.error('POST /api/interviews error:', err)
    return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 })
  }
}
