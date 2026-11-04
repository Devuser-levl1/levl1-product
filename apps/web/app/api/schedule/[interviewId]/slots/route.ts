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
  // Full horizon (Fixpack 6 #2): with a 24/7 window, a 40-slot cap reached only
  // ~20 hours ahead. The page groups by day, so the whole horizon is fine.
  const slots = availableSlots(booked).slice(0, 2000).map((s) => s.toISOString())
  return NextResponse.json({ slots, timezone: SLOT_CONFIG.timezone, consentGiven: interview.consentGiven, instantStart: SLOT_CONFIG.instantStart, leadMinutes: SLOT_CONFIG.leadMinutes })
}
