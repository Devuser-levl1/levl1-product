import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/screen/auth/email'

export const dynamic = 'force-dynamic'

// GET — validate token and return invite info
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const member = await prisma.teamMember.findUnique({
      where:   { inviteToken: params.token },
      include: { agency: true },
    })
    if (!member || member.status === 'active') {
      return NextResponse.json({ error: 'Invalid or already used invite link' }, { status: 404 })
    }
    return NextResponse.json({
      name:       member.name,
      email:      member.email,
      role:       member.role,
      agencyName: member.agency.name,
      agencyId:   member.agencyId,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to validate invite'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — accept the invite and create the (passwordless) User. The teammate
// then signs in with an email code. No password is set (passwords are retired).
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { name } = await req.json().catch(() => ({}))

    const member = await prisma.teamMember.findUnique({
      where:   { inviteToken: params.token },
      include: { agency: true },
    })
    if (!member || member.status === 'active') {
      return NextResponse.json({ error: 'Invalid or already used invite link' }, { status: 404 })
    }

    const email = normalizeEmail(member.email)  // normalize → no duplicate-by-case

    // Create or update user (passwordless).
    await prisma.user.upsert({
      where: { email },
      create: {
        name:         name?.trim() || member.name,
        email,
        role:         member.role,
        agencyId:     member.agencyId,
        emailVerified: true,
      },
      update: {
        name:         name?.trim() || member.name,
        role:         member.role,
        emailVerified: true,
      },
    })

    // Mark member as active
    await prisma.teamMember.update({
      where: { id: member.id },
      data:  { status: 'active', joinedAt: new Date(), inviteToken: null },
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to accept invite'
    console.error('[accept-invite] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
