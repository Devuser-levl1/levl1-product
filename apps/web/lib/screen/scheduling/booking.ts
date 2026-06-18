import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── Atomic slot booking (Build I-P0-1) ─────────────────────────────────────
// Booking goes through the SlotBooking @@unique([positionId, startTime]) so two
// candidates can never hold the same slot. Reschedule = release-then-book in ONE
// transaction, so a clash on the new slot rolls back and KEEPS the old slot.

export type BookResult =
  | { ok: true; start: Date; end: Date }
  | { ok: false; reason: 'taken' | 'error'; error?: string }

export async function bookSlot(interviewId: string, positionId: string, candidateId: string, start: Date, durationMin: number): Promise<BookResult> {
  const end = new Date(start.getTime() + durationMin * 60_000)
  try {
    await prisma.$transaction(async (tx) => {
      await tx.slotBooking.deleteMany({ where: { interviewId } })   // release prior (reschedule)
      await tx.slotBooking.create({ data: { interviewId, positionId, candidateId, startTime: start, endTime: end } })
    })
    return { ok: true, start, end }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { ok: false, reason: 'taken' }
    console.error('[booking] bookSlot error:', e instanceof Error ? e.message : e)
    return { ok: false, reason: 'error', error: 'Could not book that slot.' }
  }
}

export async function releaseBooking(interviewId: string): Promise<void> {
  await prisma.slotBooking.deleteMany({ where: { interviewId } })
}

// Booked (future) start instants for a position — used to hide taken slots.
export async function bookedStartIso(positionId: string): Promise<Set<string>> {
  const rows = await prisma.slotBooking.findMany({ where: { positionId, startTime: { gte: new Date(Date.now() - 60_000) } }, select: { startTime: true } })
  return new Set(rows.map((r) => r.startTime.toISOString()))
}
