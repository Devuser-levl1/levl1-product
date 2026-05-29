import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        position: { select: { id: true, title: true, company: true } },
        interview: { select: { id: true, status: true } },
        report: { select: { id: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    })
    return NextResponse.json(candidates)
  } catch (err) {
    console.error('GET /api/candidates error:', err)
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (Array.isArray(body)) {
      const created = await prisma.$transaction(
        body.map((c: Record<string, unknown>) => prisma.candidate.create({ data: c as never })),
      )
      return NextResponse.json(created, { status: 201 })
    }
    const candidate = await prisma.candidate.create({ data: body })
    return NextResponse.json(candidate, { status: 201 })
  } catch (err) {
    console.error('POST /api/candidates error:', err)
    return NextResponse.json({ error: 'Failed to create candidate(s)' }, { status: 500 })
  }
}
