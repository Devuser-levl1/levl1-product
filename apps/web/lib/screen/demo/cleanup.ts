import { prisma } from '@/lib/prisma'

// ── Ephemeral demo cleanup (Screen-scoped) ─────────────────────────────────
// Demo runs are disposable — nothing is kept after the prospect is done. These
// helpers only ever touch records tagged isDemo, so they can never delete real
// agency data.

// Delete one demo session's full graph. Children first (FKs), then parents.
export async function deleteDemoSession(candidateId: string, positionId: string, interviewId: string) {
  await prisma.interviewIntegrityEvent.deleteMany({ where: { interviewId } }).catch(() => {})
  await prisma.slotBooking.deleteMany({ where: { interviewId } }).catch(() => {})
  await prisma.report.deleteMany({ where: { candidateId } }).catch(() => {})
  await prisma.interview.deleteMany({ where: { id: interviewId } }).catch(() => {})
  await prisma.candidate.deleteMany({ where: { id: candidateId, isDemo: true } }).catch(() => {})
  // Demo positions are per-run + disposable — remove once no candidates remain.
  const remaining = await prisma.candidate.count({ where: { positionId } }).catch(() => 1)
  if (remaining === 0) {
    await prisma.questionSet.deleteMany({ where: { positionId } }).catch(() => {})
    await prisma.position.deleteMany({ where: { id: positionId, isDemo: true } }).catch(() => {})
  }
}

// Safety-net sweep: delete any demo data older than the TTL, regardless of
// whether the client fired a cleanup — demo data can never accumulate.
export async function sweepStaleDemoData(ttlMinutes = 60) {
  const cutoff = new Date(Date.now() - ttlMinutes * 60_000)
  const stale = await prisma.interview.findMany({
    where: { isDemo: true, createdAt: { lt: cutoff } },
    select: { id: true, candidateId: true, positionId: true },
  })
  for (const iv of stale) await deleteDemoSession(iv.candidateId, iv.positionId, iv.id)
  if (stale.length) console.log('[demo/cleanup] swept %d stale demo session(s)', stale.length)
  return stale.length
}
