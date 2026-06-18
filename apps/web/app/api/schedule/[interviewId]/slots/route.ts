import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { availableSlots } from '@/lib/screen/scheduling/slots'
import { bookedStartIso } from '@/lib/screen/scheduling/booking'
import { SLOT_CONFIG } from '@/lib/screen/scheduling/config'

export const dynamic = 'force-dynamic'

// GET — open (unbooked) slots for this interview's position, from the fixed
// daily-slot config, with already-booked instants removed.
export async function GET(_req: NextRequest, { params }: { params: { interviewId: string } }) {
  const interview = await prisma.interview.findUnique({ where: { id: params.interviewId }, select: { positionId: true, consentGiven: true } })
  if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  const booked = await bookedStartIso(interview.positionId)
  const slots = availableSlots(booked).slice(0, 40).map((s) => s.toISOString())
  return NextResponse.json({ slots, timezone: SLOT_CONFIG.timezone, consentGiven: interview.consentGiven })
}
