import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** PATCH /api/agency/voice — save voiceAccent for the first agency record */
export async function PATCH(req: NextRequest) {
  try {
    const { voiceAccent } = await req.json()
    if (!voiceAccent) {
      return NextResponse.json({ error: 'voiceAccent is required' }, { status: 400 })
    }
    const agency = await prisma.agency.findFirst()
    if (!agency) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }
    const updated = await prisma.agency.update({
      where: { id: agency.id },
      data: { voiceAccent },
    })
    return NextResponse.json({ voiceAccent: updated.voiceAccent })
  } catch (err) {
    console.error('agency voice PATCH error:', err)
    return NextResponse.json({ error: 'Failed to save voice setting' }, { status: 500 })
  }
}

/** GET /api/agency/voice — read current voiceAccent */
export async function GET() {
  try {
    const agency = await prisma.agency.findFirst({ select: { voiceAccent: true } })
    return NextResponse.json({ voiceAccent: agency?.voiceAccent ?? 'american' })
  } catch (err) {
    console.error('agency voice GET error:', err)
    return NextResponse.json({ voiceAccent: 'american' })
  }
}
