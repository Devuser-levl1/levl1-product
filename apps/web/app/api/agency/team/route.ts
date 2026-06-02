import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { sendEmail } from '@/lib/emailService'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const [members, users] = await Promise.all([
      prisma.teamMember.findMany({
        where:   { agencyId: session.agencyId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.findMany({
        where:   { agencyId: session.agencyId },
        select:  { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    return NextResponse.json({ members, users })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { memberId } = await req.json()
    if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })

    const member = await prisma.teamMember.findUnique({ where: { id: memberId } })
    if (!member || member.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.teamMember.delete({ where: { id: memberId } })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

// Resend invite
export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { memberId } = await req.json()
    if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })

    const member = await prisma.teamMember.findUnique({
      where:   { id: memberId },
      include: { agency: true },
    })
    if (!member || member.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (member.status === 'active') {
      return NextResponse.json({ error: 'Member already active' }, { status: 400 })
    }

    const newToken = crypto.randomBytes(32).toString('hex')
    await prisma.teamMember.update({
      where: { id: memberId },
      data:  { inviteToken: newToken, status: 'invited' },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    if (process.env.RESEND_API_KEY) {
      await sendEmail({
        to:      member.email,
        subject: `Reminder: You've been invited to join ${member.agency.name} on Levl1`,
        html: `<p>${session.name} has resent your invitation to join <strong>${member.agency.name}</strong> on Levl1.</p>
<a href="${appUrl}/accept-invite/${newToken}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Accept Invitation →</a>
<p style="color:#94A3B8;font-size:12px;margin-top:16px">This link expires in 7 days.</p>`,
      }).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
