import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { isAccountType } from '@/lib/screen/account-type'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const agency = await prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: { id: true, name: true, website: true, senderName: true, senderEmail: true, brandColor: true, logoUrl: true, voiceAccent: true, resendDomainVerified: true, accountType: true },
    })
    return NextResponse.json(agency ?? {})
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Workspace settings are admin-only (Screen RBAC).
    const access = recruiterAccess(req, { admin: true })
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const session = access.session

    const body = await req.json()
    const ALLOWED = ['name', 'website', 'senderName', 'senderEmail', 'brandColor', 'logoUrl'] as const
    const data: Partial<Record<typeof ALLOWED[number] | 'accountType', string>> = {}
    for (const key of ALLOWED) {
      if (key in body && typeof body[key] === 'string') {
        data[key] = body[key] as string
      }
    }
    // Agency vs in-house company — drives the job-setup form (validated enum).
    if ('accountType' in body) {
      if (!isAccountType(body.accountType)) return NextResponse.json({ error: 'accountType must be "agency" or "company"' }, { status: 400 })
      data.accountType = body.accountType
    }

    const agency = await prisma.agency.update({
      where: { id: session.agencyId },
      data,
      select: { id: true, name: true, website: true, senderName: true, senderEmail: true, brandColor: true, logoUrl: true, accountType: true },
    })
    return NextResponse.json(agency)
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
