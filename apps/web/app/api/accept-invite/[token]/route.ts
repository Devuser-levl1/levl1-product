import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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

// POST — set password and create User
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { name, password } = await req.json()
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const member = await prisma.teamMember.findUnique({
      where:   { inviteToken: params.token },
      include: { agency: true },
    })
    if (!member || member.status === 'active') {
      return NextResponse.json({ error: 'Invalid or already used invite link' }, { status: 404 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Create or update user
    await prisma.user.upsert({
      where: { email: member.email },
      create: {
        name:         name?.trim() || member.name,
        email:        member.email,
        role:         member.role,
        agencyId:     member.agencyId,
        passwordHash,
        emailVerified: true,
      },
      update: {
        name:         name?.trim() || member.name,
        role:         member.role,
        passwordHash,
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
