import { prisma } from '@/lib/prisma'

// ── Stage usage metering (Screen-scoped, server-only) ──────────────────────
// Every billable Solve action is logged once, tagged stage = 'solve', so
// billing can price stages separately (pay-per-use / per-stage licence).
// Idempotent per (kind, refId) — retries never double-count. Never throws:
// metering must not break the candidate's flow.

export type Stage = 'screen' | 'solve' | 'interview'
export type SolveUsageKind = 'solve_invite' | 'solve_submission' | 'solve_defense' | 'solve_exec'

export async function recordStageUsage(o: { agencyId: string; stage: Stage; kind: SolveUsageKind; refId: string; units?: number; isDemo?: boolean }) {
  try {
    await prisma.stageUsageEvent.upsert({
      where: { kind_refId: { kind: o.kind, refId: o.refId } },
      // solve_exec accumulates Judge0 executions on one row per submission.
      update: o.kind === 'solve_exec' ? { units: { increment: o.units ?? 1 } } : {},
      create: { agencyId: o.agencyId, stage: o.stage, kind: o.kind, refId: o.refId, units: o.units ?? 1, isDemo: !!o.isDemo },
    })
  } catch (e) {
    console.warn('[usage] stage usage not recorded:', JSON.stringify({ kind: o.kind, refId: o.refId, err: e instanceof Error ? e.message : String(e) }))
  }
}
