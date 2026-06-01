import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { ids } = await req.json().catch(() => ({ ids: null }))

    if (ids && Array.isArray(ids)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: { agencyId: session.agencyId, id: { in: ids } },
        data: { isRead: true },
      })
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { agencyId: session.agencyId, isRead: false },
        data: { isRead: true },
      })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 })
  }
}
