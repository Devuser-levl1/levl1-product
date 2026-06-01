import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json([], { status: 200 }) // Silently return empty for unauthenticated

    const notifications = await prisma.notification.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json(notifications)
  } catch {
    return NextResponse.json([], { status: 200 }) // Return empty on error — non-critical
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()
    const notification = await prisma.notification.create({
      data: { ...body, agencyId: session.agencyId },
    })
    return NextResponse.json(notification, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
