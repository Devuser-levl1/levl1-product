import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const agency = await prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: { id: true, name: true, website: true, senderName: true, senderEmail: true, brandColor: true, logoUrl: true, voiceAccent: true, resendDomainVerified: true },
    })
    return NextResponse.json(agency ?? {})
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()
    const ALLOWED = ['name', 'website', 'senderName', 'senderEmail', 'brandColor', 'logoUrl'] as const
    const data: Partial<Record<typeof ALLOWED[number], string>> = {}
    for (const key of ALLOWED) {
      if (key in body && typeof body[key] === 'string') {
        data[key] = body[key] as string
      }
    }

    const agency = await prisma.agency.update({
      where: { id: session.agencyId },
      data,
      select: { id: true, name: true, website: true, senderName: true, senderEmail: true, brandColor: true, logoUrl: true },
    })
    return NextResponse.json(agency)
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
