import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const clients = await prisma.client.findMany({
      where:   { agencyId: session.agencyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { positions: true } },
        positions: {
          select: {
            id: true, title: true, status: true,
            _count: { select: { candidates: true, interviews: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json(clients)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch clients'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()
    const { name, industry, website, contactName, contactEmail, contactPhone, managerEmail, l2Threshold } = body

    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const client = await prisma.client.create({
      data: {
        agencyId:     session.agencyId,
        name:         name.trim(),
        industry:     industry || null,
        website:      website  || null,
        contactName:  contactName  || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        managerEmail: managerEmail || null,
        l2Threshold:  typeof l2Threshold === 'number' ? l2Threshold : 75,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create client'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
