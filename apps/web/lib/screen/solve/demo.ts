import { prisma } from '@/lib/prisma'
import { sanitizeSolveConfig, type SolveConfig } from './config'

// ── Public Solve demo (Screen-scoped, server-only) ─────────────────────────
// ONE code path: a demo take-home is a REAL SolveSubmission on the real
// candidate page (/solve/[token]) with the real editor, Judge0, AI assistant,
// defense interview and report — just demo content (machine-verified starter
// tasks, lib/screen/demo/work-sample.ts), a short envelope, isDemo everywhere,
// and the isolated demo agency (lib/screen/demo/lead.ts). Excluded from real
// analytics; usage rows are tagged isDemo.
//
// Envelope: AI help ALLOWED (shows the assistant + AI-fluency scoring), a
// 20-minute clock (the shortest the config allows), and a 2-question defense
// right after submitting. The prospect sees their own report at the end
// (demo-only — real candidates never see theirs).

export const DEMO_SOLVE_CONFIG: SolveConfig = sanitizeSolveConfig({
  windowDays: 1,
  durationMinutes: 20,
  languages: [],
  defenseRequired: true,
  defenseTiming: 'immediate',
  defenseWindowHours: 2,
  defenseQuestions: 2,
  aiPolicy: 'allowed',
  integrityLevel: 'standard',
})

/** Demo data is disposable: delete one demo take-home's graph (only isDemo rows). */
export async function deleteSolveDemo(submissionId: string) {
  const s = await prisma.solveSubmission.findFirst({ where: { id: submissionId, isDemo: true }, select: { candidateId: true, positionId: true } })
  if (!s) return false
  // SolveSubmission + SolveAssignment cascade from Candidate / Position.
  await prisma.candidate.deleteMany({ where: { id: s.candidateId, isDemo: true } }).catch(() => {})
  const remaining = await prisma.candidate.count({ where: { positionId: s.positionId } }).catch(() => 1)
  if (remaining === 0) await prisma.position.deleteMany({ where: { id: s.positionId, isDemo: true } }).catch(() => {})
  return true
}

/** Safety-net sweep — longer TTL than the Screen demo (take-home + defense + report). */
export async function sweepStaleSolveDemos(ttlMinutes = 180) {
  const cutoff = new Date(Date.now() - ttlMinutes * 60_000)
  const stale = await prisma.solveSubmission.findMany({ where: { isDemo: true, createdAt: { lt: cutoff } }, select: { id: true }, take: 50 })
  for (const s of stale) await deleteSolveDemo(s.id)
  if (stale.length) console.log('[solve-demo] swept %d stale demo take-home(s)', stale.length)
  return stale.length
}
