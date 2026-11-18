import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { execute, judge0Configured } from '@/lib/screen/workspace/judge0'
import { executionPlan, isWorkspaceLanguage, outputsMatch, sanitizeTask, type WorkSampleTask, type WorkspaceLanguage } from '@/lib/screen/workspace/task'
import { digest, type TimelineEvent } from '@/lib/screen/workspace/timeline'
import { openArray, openText } from '@/lib/screen/privacy/fields'
import { sanitizeSolveConfig, type IntegrityLevel } from './config'
import { recordStageUsage } from './usage'

// ── Solve submit + auto-evaluation (Screen-scoped, server-only) ────────────
// On submit (or deadline auto-submit):
//   1. status started → submitted, atomically (idempotent: one finalize wins)
//   2. run EVERY test (hidden included) on the final code in Judge0 — the
//      scored correctness never depends on whether the candidate clicked Run
//   3. classify the submission: ok | trivial | empty. Trivial/empty is NEVER
//      silently accepted: no defense is offered, the report says so and the
//      verdict is "insufficient evidence", not a score.
//   4. integrity summary from the work timeline + tab-away counters
//   5. open the defense window (if required) or queue the report

export type SubmissionQuality = 'ok' | 'trivial' | 'empty'

const meaningful = (s: string) => s.replace(/\/\/.*$|#.*$|--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '')

/** How much real work is in the code, relative to the starter code. */
export function classifySubmission(code: string, starter: string): { quality: SubmissionQuality; addedChars: number } {
  const c = meaningful(code)
  if (!c) return { quality: 'empty', addedChars: 0 }
  const st = meaningful(starter)
  // Characters of code beyond the starter (order-insensitive line diff, cheap + robust).
  const starterLines = new Set(starter.split('\n').map((l) => meaningful(l)).filter(Boolean))
  const added = code.split('\n').map((l) => meaningful(l)).filter((l) => l && !starterLines.has(l)).join('').length
  if (c === st || added < 40) return { quality: 'trivial', addedChars: added }
  return { quality: 'ok', addedChars: added }
}

export interface FinalTestRow { id: string; name: string; hidden: boolean; passed: boolean; status: string }

export async function runAllTests(task: WorkSampleTask, language: WorkspaceLanguage, code: string): Promise<FinalTestRow[] | null> {
  if (!judge0Configured() || !code.trim() || !task.tests.length) return null
  const rows: FinalTestRow[] = []
  for (let i = 0; i < task.tests.length; i += 3) {
    const batch = task.tests.slice(i, i + 3)
    const outs = await Promise.all(batch.map((t) => execute({ language, ...executionPlan(language, code, t.input) })))
    batch.forEach((t, j) => rows.push({ id: t.id, name: t.name, hidden: t.hidden, passed: outs[j].status === 'ok' && outputsMatch(outs[j].stdout, t.expected), status: outs[j].status }))
  }
  // A transport failure on every test is "couldn't run", not "failed".
  if (rows.length && rows.every((r) => r.status === 'error')) return null
  return rows
}

export interface IntegritySummary {
  tabSwitches: number; awayMs: number; pastes: number; largestPaste: number
  flags: { kind: string; note: string }[]
  level: IntegrityLevel
}

export function integritySummary(timeline: TimelineEvent[], counters: { tabSwitches?: number; awayMs?: number } | null, level: IntegrityLevel, aiAllowed: boolean): IntegritySummary {
  const d = digest(timeline)
  const tabSwitches = Math.max(0, Math.round(counters?.tabSwitches ?? 0))
  const awayMs = Math.max(0, Math.round(counters?.awayMs ?? 0))
  const flags: IntegritySummary['flags'] = []
  const pasteLimit = level === 'strict' ? 200 : 600
  if (level !== 'light' || d.pastes.largest >= 600) {
    const big = timeline.filter((e) => e.k === 'paste' && (e.n ?? 0) >= pasteLimit)
    if (big.length) flags.push({ kind: 'large_paste', note: `${big.length} paste${big.length > 1 ? 's' : ''} of ${pasteLimit}+ characters (largest ${d.pastes.largest})${aiAllowed ? ' — outside AI help was allowed; judge by the defense' : ''}.` })
  }
  if (level !== 'light' && tabSwitches >= 15) flags.push({ kind: 'tab_away', note: `Left the task tab ${tabSwitches} times (${Math.round(awayMs / 60000)} min away in total).` })
  if (d.typedChars < 40 && d.pastes.total > 200) flags.push({ kind: 'mostly_pasted', note: 'Almost all of the code arrived by paste, very little was typed.' })
  return { tabSwitches, awayMs, pastes: d.pastes.count, largestPaste: d.pastes.largest, flags, level }
}

/** Submit (candidate) or auto-submit (deadline). Safe to call more than once. */
export async function finalizeSubmission(id: string, opts: { auto?: boolean } = {}): Promise<{ ok: boolean; quality?: SubmissionQuality; defense?: boolean }> {
  const now = new Date()
  const flipped = await prisma.solveSubmission.updateMany({ where: { id, status: 'started' }, data: { status: 'submitted', submittedAt: now, autoSubmitted: !!opts.auto } })
  if (!flipped.count) return { ok: false }

  const row = await prisma.solveSubmission.findUnique({
    where: { id },
    select: { agencyId: true, isDemo: true, task: true, config: true, language: true, code: true, timeline: true, integrity: true, positionId: true, candidate: { select: { name: true } }, position: { select: { title: true } } },
  })
  if (!row) return { ok: false }
  const task = sanitizeTask(row.task)
  const cfg = sanitizeSolveConfig(row.config)
  const code = openText(row.code) ?? ''
  const language: WorkspaceLanguage = isWorkspaceLanguage(row.language) ? row.language : (task?.language ?? 'python')
  const { quality } = classifySubmission(code, task?.starterCode ?? '')

  let finalTests: FinalTestRow[] | null = null
  if (task && quality !== 'empty') {
    try { finalTests = await runAllTests(task, language, code) } catch (e) { console.warn('[solve] final tests failed:', e instanceof Error ? e.message : e) }
  }
  const timeline = openArray<TimelineEvent>(row.timeline)
  const counters = (row.integrity && typeof row.integrity === 'object' ? row.integrity : null) as { tabSwitches?: number; awayMs?: number } | null
  const integrity = integritySummary(timeline, counters, cfg.integrityLevel, cfg.aiPolicy === 'allowed')

  const defense = cfg.defenseRequired && quality === 'ok'
  const defenseDeadlineAt = defense ? new Date(now.getTime() + (cfg.defenseTiming === 'immediate' ? 2 : cfg.defenseWindowHours) * 3600_000) : null
  await prisma.solveSubmission.update({
    where: { id },
    data: {
      submissionQuality: quality,
      ...(finalTests ? { finalTests: finalTests as unknown as Prisma.InputJsonValue } : {}),
      integrity: integrity as unknown as Prisma.InputJsonValue,
      defenseStatus: defense ? 'pending' : 'not_required',
      defenseDeadlineAt,
    },
  })
  await recordStageUsage({ agencyId: row.agencyId, stage: 'solve', kind: 'solve_submission', refId: id, isDemo: row.isDemo })
  console.info(JSON.stringify({ evt: 'solve_submitted', id, auto: !!opts.auto, quality, tests: finalTests ? `${finalTests.filter((t) => t.passed).length}/${finalTests.length}` : 'not_run', defense }))

  await prisma.notification.create({
    data: {
      agencyId: row.agencyId, type: 'solve_submitted', title: 'Take-home submitted',
      body: `${row.candidate.name} ${opts.auto ? 'ran out of time on' : 'submitted'} the take-home for ${row.position.title}${quality !== 'ok' ? ' — no meaningful work was submitted' : defense ? ' — defense interview pending' : ''}.`,
      link: `/positions/${row.positionId}?tab=solve`,
    },
  }).catch(() => {})

  if (!defense) {
    const { queueSolveReport } = await import('./report')
    queueSolveReport(id)
  }
  return { ok: true, quality, defense }
}
