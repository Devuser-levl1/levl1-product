import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { judge0Configured, execute } from '@/lib/screen/workspace/judge0'
import { executionPlan, outputsMatch, isWorkspaceLanguage } from '@/lib/screen/workspace/task'
import { hasWorkspace, resolveMode } from '@/lib/screen/workspace/modes'
import { candidatesForPosition } from '@/lib/screen/taskbank/position-select'
import { bankTaskToWorkSample } from '@/lib/screen/taskbank/select'
import { sanitizeRubric, sanitizeTests, sanitizeTaskInput } from '@/lib/screen/taskbank/types'
import { readSelection, reviewReadiness, sanitizeRubricInput, snapshotOf, type RubricContent, type RubricTier } from '@/lib/screen/rubrics/types'
import { rowToContent, RUBRIC_CONTENT_SELECT } from '@/lib/screen/rubrics/store'
import { generateOneRubric, generateRubricDrafts, generateTaskDraft, type PositionContext, type RubricDraft, type TaskDraft } from './generate'
import { EMPTY_STATE, isLowConfidence, MIN_NOTE_CHARS, readState, rubricFlags, taskFlags, THIN_JD_CHARS, type CalibrationItem, type CalibrationState } from './types'

// ── Calibration orchestration (Screen-scoped, server-only) ─────────────────
// AI drafts → moderator calibrates. Content lives in the rubric library / task
// bank as DRAFTS (source "ai"); Position.calibration holds the per-item review
// state (reasoning, confidence, flags, decision). Approval is per item, on the
// server: low-confidence items need a calibration note, rubrics must be review-
// ready, tasks must pass Judge0 — and only then does anything go ACTIVE and get
// attached to the position (rubricSelection / workSampleTask).

const now = () => new Date().toISOString()
const newId = () => crypto.randomBytes(6).toString('hex')
const STUCK_MS = 10 * 60_000

type Err = { ok: false; status: number; error: string }
const fail = (status: number, error: string): Err => ({ ok: false, status, error })

async function loadPosition(positionId: string, agencyId: string) {
  return prisma.position.findFirst({
    where: { id: positionId, agencyId },
    select: {
      id: true, title: true, company: true, jdText: true, techStack: true, mustHaves: true, goodToHave: true,
      experienceMin: true, experienceMax: true, primaryDomain: true, interviewMode: true, roleType: true,
      calibration: true, rubricSelection: true, workSampleTask: true,
    },
  })
}
type Pos = NonNullable<Awaited<ReturnType<typeof loadPosition>>>

async function contextFor(p: Pos, agencyId: string): Promise<PositionContext> {
  const existing = await prisma.rubricLibraryItem.findMany({ where: { agencyId, status: 'active' }, select: { id: true, area: true, subSkill: true, keywords: true }, take: 60, orderBy: { updatedAt: 'desc' } })
  return {
    title: p.title, company: p.company, jdText: p.jdText, techStack: p.techStack, mustHaves: p.mustHaves, goodToHave: p.goodToHave,
    experienceMin: p.experienceMin, experienceMax: p.experienceMax, primaryDomain: p.primaryDomain, existing,
  }
}

async function saveState(positionId: string, state: CalibrationState) {
  await prisma.position.update({ where: { id: positionId }, data: { calibration: state as unknown as Prisma.InputJsonValue } })
}

/* ── item builders ───────────────────────────────────────────────────────── */

async function rubricItemFromDraft(d: RubricDraft, p: Pos, agencyId: string, by: string, existingActive: { subSkill: string }[], reuseRow?: string | null): Promise<CalibrationItem> {
  let refId = d.existingRubricId
  if (!refId) {
    const row = reuseRow
      ? await prisma.rubricLibraryItem.update({ where: { id: reuseRow }, data: rubricData(d), select: { id: true } })
      : await prisma.rubricLibraryItem.create({ data: { ...rubricData(d), agencyId, status: 'draft', source: 'ai', originPositionId: p.id, createdBy: by }, select: { id: true } })
    refId = row.id
  }
  return {
    id: newId(), kind: 'rubric', refId, reuse: !!d.existingRubricId, tier: d.tier, proposedTier: d.tier,
    reasoning: d.reasoning, tierReason: d.tierReason, confidence: d.confidence, uncertainty: d.uncertainty,
    flags: d.existingRubricId ? [] : rubricFlags({ ...d, tier: d.tier }, p, existingActive.filter((e) => e.subSkill !== d.subSkill || !d.existingRubricId)),
    decision: 'pending', note: null, decidedBy: null, decidedAt: null, updatedAt: now(),
  }
}

function rubricData(d: RubricContent) {
  return {
    area: d.area, subSkill: d.subSkill, proficientIn: d.proficientIn, ableTo: d.ableTo, practices: d.practices,
    strong: d.strong, weak: d.weak, keywords: d.keywords, probes: d.probes as unknown as Prisma.InputJsonValue,
  }
}

function taskData(t: TaskDraft) {
  return {
    title: t.task.title, prompt: t.task.prompt, roles: t.task.roles, skills: t.task.skills, difficulty: t.task.difficulty,
    experienceMin: t.task.experienceMin, experienceMax: t.task.experienceMax, languages: t.task.languages,
    starterCode: t.task.starterCode as Prisma.InputJsonValue, tests: t.task.tests as unknown as Prisma.InputJsonValue,
    referenceSolution: t.task.referenceSolution, referenceLanguage: t.task.referenceLanguage, minutes: t.task.minutes,
    lastVerifiedAt: t.verified ? new Date() : null,
    qaEvidence: { generated: true, verified: t.verified, note: t.verifyNote, droppedTests: t.droppedTests } as Prisma.InputJsonValue,
  }
}

async function taskItemFromDraft(t: TaskDraft, p: Pos, agencyId: string, by: string, reuseRow?: string | null): Promise<CalibrationItem> {
  const rubric = { criteria: t.rubric.criteria as unknown as Prisma.InputJsonValue, probes: t.rubric.probes as unknown as Prisma.InputJsonValue }
  const row = reuseRow
    ? await prisma.taskBankItem.update({ where: { id: reuseRow }, data: { ...taskData(t), status: 'draft', reviewedBy: null, reviewedAt: null, rubric: { upsert: { create: rubric, update: rubric } } }, select: { id: true } })
    : await prisma.taskBankItem.create({ data: { ...taskData(t), agencyId, status: 'draft', source: 'ai', originPositionId: p.id, createdBy: by, rubric: { create: rubric } }, select: { id: true } })
  return {
    id: newId(), kind: 'task', refId: row.id, reuse: false, tier: null, proposedTier: null,
    reasoning: `${t.reasoning}${t.verifyNote ? ` (${t.verifyNote})` : ''}`.trim(), tierReason: '', confidence: t.confidence, uncertainty: t.uncertainty,
    flags: taskFlags({ verified: t.verified, testCount: t.task.tests.length, droppedTests: t.droppedTests, hasReference: !!t.task.referenceSolution.trim(), judge0: judge0Configured() }),
    decision: 'pending', note: null, decidedBy: null, decidedAt: null, updatedAt: now(),
  }
}

/* ── generation ──────────────────────────────────────────────────────────── */

/** Start (or restart) drafting in the background. Approved items are kept. */
export async function startGeneration(positionId: string, agencyId: string, by: string): Promise<{ ok: true; state: CalibrationState } | Err> {
  const p = await loadPosition(positionId, agencyId)
  if (!p) return fail(404, 'Position not found')
  const state = readState(p.calibration)
  if (state.status === 'generating' && state.startedAt && Date.now() - Date.parse(state.startedAt) < STUCK_MS) return { ok: true, state }
  const next: CalibrationState = { ...state, status: 'generating', error: null, startedAt: now(), model: SCORING_MODEL }
  await saveState(positionId, next)
  void runGeneration(positionId, agencyId, by)
  return { ok: true, state: next }
}

async function runGeneration(positionId: string, agencyId: string, by: string) {
  const t0 = Date.now()
  try {
    const p = await loadPosition(positionId, agencyId)
    if (!p) return
    const prev = readState(p.calibration)
    const ctx = await contextFor(p, agencyId)
    const jdThin = (p.jdText ?? '').trim().length < THIN_JD_CHARS || p.techStack.length < 2

    // Keep everything the moderator already approved; retire superseded AI drafts.
    const kept = prev.items.filter((i) => i.decision === 'approved')
    for (const i of prev.items.filter((x) => x.decision !== 'approved' && !x.reuse)) {
      if (i.kind === 'rubric') await prisma.rubricLibraryItem.updateMany({ where: { id: i.refId, agencyId, source: 'ai', status: { not: 'active' } }, data: { status: 'retired' } })
      else await prisma.taskBankItem.updateMany({ where: { id: i.refId, agencyId, source: 'ai', status: { not: 'active' } }, data: { status: 'retired' } })
    }

    const { drafts, jdThin: modelThin } = await generateRubricDrafts(ctx)
    const keptRefs = new Set(kept.map((k) => k.refId))
    const items: CalibrationItem[] = [...kept]
    for (const d of drafts) {
      if (d.existingRubricId && keptRefs.has(d.existingRubricId)) continue
      const it = await rubricItemFromDraft(d, p, agencyId, by, ctx.existing)
      if (jdThin || modelThin) it.flags.unshift('The JD is thin — the AI had little to go on.')
      items.push(it)
    }

    // Tasks (technical / hybrid roles): reuse a reviewed bank task that fits, else draft one.
    if (hasWorkspace(resolveMode(p)) && !p.workSampleTask && !kept.some((k) => k.kind === 'task')) {
      const ranked = await candidatesForPosition(positionId, agencyId).catch(() => null)
      const best = ranked?.ranked.find((r) => r.score > 0)
      if (best) {
        items.push({
          id: newId(), kind: 'task', refId: best.task.id, reuse: true, tier: null, proposedTier: null,
          reasoning: `An already-reviewed task bank task fits this role: ${best.reasons.slice(0, 3).join('; ')}.`, tierReason: '',
          confidence: 0.9, uncertainty: '', flags: [], decision: 'pending', note: null, decidedBy: null, decidedAt: null, updatedAt: now(),
        })
      } else {
        const td = await generateTaskDraft(ctx)
        const it = await taskItemFromDraft(td, p, agencyId, by)
        if (jdThin || modelThin) it.flags.unshift('The JD is thin — the AI had little to go on.')
        items.push(it)
      }
    }

    await saveState(positionId, { status: 'ready', error: null, model: SCORING_MODEL, startedAt: prev.startedAt, generatedAt: now(), jdThin: jdThin || modelThin, items })
    console.info(JSON.stringify({ evt: 'calibration_generated', positionId, items: items.length, kept: kept.length, ms: Date.now() - t0, model: SCORING_MODEL }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(JSON.stringify({ evt: 'calibration_failed', positionId, detail: msg.slice(0, 300), ms: Date.now() - t0 }))
    const p = await prisma.position.findUnique({ where: { id: positionId }, select: { calibration: true } }).catch(() => null)
    const s = readState(p?.calibration)
    await saveState(positionId, { ...s, status: 'failed', error: /credit balance/i.test(msg) ? 'The AI account is out of credits.' : msg.slice(0, 300) }).catch(() => {})
  }
}

/* ── read (hydrated for the UI) ──────────────────────────────────────────── */

export async function readCalibration(positionId: string, agencyId: string) {
  const p = await loadPosition(positionId, agencyId)
  if (!p) return null
  const state = readState(p.calibration)
  const rubricIds = state.items.filter((i) => i.kind === 'rubric').map((i) => i.refId)
  const taskIds = state.items.filter((i) => i.kind === 'task').map((i) => i.refId)
  const [rubrics, tasks] = await Promise.all([
    rubricIds.length ? prisma.rubricLibraryItem.findMany({ where: { agencyId, id: { in: rubricIds } }, select: { ...RUBRIC_CONTENT_SELECT, status: true, source: true } }) : [],
    taskIds.length ? prisma.taskBankItem.findMany({ where: { agencyId, id: { in: taskIds } }, include: { rubric: { select: { criteria: true, probes: true } } } }) : [],
  ])
  const rById = new Map(rubrics.map((r) => [r.id, r]))
  const tById = new Map(tasks.map((t) => [t.id, t]))
  return {
    state: { ...state, items: undefined },
    items: state.items.map((i) => {
      const lowConfidence = isLowConfidence(i)
      if (i.kind === 'rubric') {
        const r = rById.get(i.refId)
        return { ...i, lowConfidence, missing: !r, rubric: r ? { ...rowToContent(r), status: r.status, source: r.source } : null }
      }
      const t = tById.get(i.refId)
      return {
        ...i, lowConfidence, missing: !t,
        task: t ? {
          id: t.id, title: t.title, prompt: t.prompt, languages: t.languages, starterCode: t.starterCode, tests: sanitizeTests(t.tests),
          referenceSolution: t.referenceSolution ?? '', minutes: t.minutes, difficulty: t.difficulty, status: t.status,
          verified: !!t.lastVerifiedAt, rubric: sanitizeRubric(t.rubric ?? {}),
        } : null,
      }
    }),
    workSampleMode: hasWorkspace(resolveMode(p)),
    judge0: judge0Configured(),
  }
}

/* ── actions ─────────────────────────────────────────────────────────────── */

async function withItem(positionId: string, agencyId: string, itemId: string) {
  const p = await loadPosition(positionId, agencyId)
  if (!p) return { p: null, state: EMPTY_STATE, item: null as CalibrationItem | null }
  const state = readState(p.calibration)
  return { p, state, item: state.items.find((i) => i.id === itemId) ?? null }
}

async function setItem(positionId: string, state: CalibrationState, itemId: string, patch: Partial<CalibrationItem>) {
  await saveState(positionId, { ...state, items: state.items.map((i) => (i.id === itemId ? { ...i, ...patch, updatedAt: now() } : i)) })
}

async function setSelection(positionId: string, current: unknown, rubricId: string, entry: ReturnType<typeof snapshotOf> | null) {
  const sel = readSelection(current).filter((s) => s.rubricId !== rubricId)
  await prisma.position.update({ where: { id: positionId }, data: { rubricSelection: (entry ? [...sel, entry] : sel) as unknown as Prisma.InputJsonValue } })
}

/** Run a bank task's reference against its tests; stores lastVerifiedAt. */
async function verifyTaskRow(taskId: string): Promise<{ ok: boolean; note: string }> {
  const t = await prisma.taskBankItem.findUnique({ where: { id: taskId } })
  if (!t?.referenceSolution?.trim()) return { ok: false, note: 'Add a reference solution first.' }
  const tests = sanitizeTests(t.tests)
  if (tests.length < 2) return { ok: false, note: 'Add at least 2 test cases.' }
  if (!judge0Configured()) return { ok: false, note: 'Judge0 is not configured — tests can\'t be verified.' }
  const language = isWorkspaceLanguage(t.referenceLanguage) ? t.referenceLanguage : 'python'
  let failed = 0
  for (const test of tests) {
    const r = await execute({ language, ...executionPlan(language, t.referenceSolution, test.input) })
    if (!(r.status === 'ok' && outputsMatch(r.stdout, test.expected))) failed++
  }
  await prisma.taskBankItem.update({ where: { id: t.id }, data: { lastVerifiedAt: failed ? null : new Date() } })
  return { ok: !failed, note: failed ? `${failed} of ${tests.length} tests fail against the reference solution.` : `All ${tests.length} tests pass.` }
}

export async function approveItem(positionId: string, agencyId: string, by: string, itemId: string, opts: { note?: string; viewed?: boolean }) {
  const { p, state, item } = await withItem(positionId, agencyId, itemId)
  if (!p || !item) return fail(404, 'Item not found')
  if (!opts.viewed) return fail(400, 'Open and read the item before approving it.')
  const note = (opts.note ?? '').trim()
  if (isLowConfidence(item) && note.length < MIN_NOTE_CHARS) return fail(400, `This item is flagged for attention — add a calibration note (what you checked or changed, at least ${MIN_NOTE_CHARS} characters).`)
  const reviewNote = note || `Calibrated from the AI draft for "${p.title}".`

  if (item.kind === 'rubric') {
    const r = await prisma.rubricLibraryItem.findFirst({ where: { id: item.refId, agencyId } })
    if (!r) return fail(404, 'The rubric no longer exists.')
    if (!item.reuse) {
      const gap = reviewReadiness(rowToContent(r))
      if (gap) return fail(400, gap)
      await prisma.rubricLibraryItem.update({ where: { id: r.id }, data: { status: 'active', reviewNote, reviewedBy: by, reviewedAt: new Date() } })
    } else if (r.status !== 'active') return fail(400, 'The library rubric this reuses is no longer active.')
    await setSelection(p.id, p.rubricSelection, r.id, snapshotOf(rowToContent(r), item.tier ?? 'good', 'jd'))
  } else {
    const t = await prisma.taskBankItem.findFirst({ where: { id: item.refId, agencyId }, include: { rubric: true } })
    if (!t) return fail(404, 'The task no longer exists.')
    if (!item.reuse) {
      if (sanitizeTests(t.tests).length < 2) return fail(400, 'A task needs at least 2 test cases.')
      if (!sanitizeRubric({ probes: t.rubric?.probes ?? [] }).probes.length) return fail(400, 'Add at least one probe with an expected answer, so the defense can be judged.')
      if (judge0Configured() && !t.lastVerifiedAt) {
        const v = await verifyTaskRow(t.id)
        if (!v.ok) return fail(400, `Tests aren't verified: ${v.note} Fix them before approving.`)
      }
      await prisma.taskBankItem.update({ where: { id: t.id }, data: { status: 'active', reviewNote, reviewedBy: by, reviewedAt: new Date() } })
    }
    const fresh = await prisma.taskBankItem.findUnique({ where: { id: t.id }, include: { rubric: { select: { criteria: true, probes: true } } } })
    if (fresh) await prisma.position.update({ where: { id: p.id }, data: { workSampleTask: bankTaskToWorkSample(fresh as never, { approvedBy: by }) as unknown as Prisma.InputJsonValue } })
  }
  await setItem(p.id, state, item.id, { decision: 'approved', note: note || null, decidedBy: by, decidedAt: now() })
  return { ok: true as const }
}

export async function rejectItem(positionId: string, agencyId: string, by: string, itemId: string, note?: string) {
  const { p, state, item } = await withItem(positionId, agencyId, itemId)
  if (!p || !item) return fail(404, 'Item not found')
  if (item.kind === 'rubric') {
    if (!item.reuse) await prisma.rubricLibraryItem.updateMany({ where: { id: item.refId, agencyId, source: 'ai' }, data: { status: 'retired' } })
    await setSelection(p.id, p.rubricSelection, item.refId, null)
  } else {
    if (!item.reuse) await prisma.taskBankItem.updateMany({ where: { id: item.refId, agencyId, source: 'ai' }, data: { status: 'retired' } })
    const ws = p.workSampleTask as { bankTaskId?: string } | null
    if (ws?.bankTaskId === item.refId) await prisma.position.update({ where: { id: p.id }, data: { workSampleTask: Prisma.DbNull } })
  }
  await setItem(p.id, state, item.id, { decision: 'rejected', note: note?.trim() || null, decidedBy: by, decidedAt: now() })
  return { ok: true as const }
}

export async function retierItem(positionId: string, agencyId: string, itemId: string, tier: RubricTier) {
  const { p, state, item } = await withItem(positionId, agencyId, itemId)
  if (!p || !item || item.kind !== 'rubric') return fail(404, 'Rubric item not found')
  if (item.decision === 'approved') {
    const sel = readSelection(p.rubricSelection).map((s) => (s.rubricId === item.refId ? { ...s, tier } : s))
    await prisma.position.update({ where: { id: p.id }, data: { rubricSelection: sel as unknown as Prisma.InputJsonValue } })
  }
  // Re-tiering to/from Must-have is a judgment call the flags should reflect.
  await setItem(p.id, state, item.id, { tier })
  return { ok: true as const }
}

/** Edit a rubric draft. A reused (shared) library rubric is FORKED into an AI draft instead of changed in place. */
export async function editRubric(positionId: string, agencyId: string, by: string, itemId: string, raw: unknown) {
  const { p, state, item } = await withItem(positionId, agencyId, itemId)
  if (!p || !item || item.kind !== 'rubric') return fail(404, 'Rubric item not found')
  const v = sanitizeRubricInput(raw)
  if (!v.ok) return fail(400, v.error)
  let refId = item.refId
  if (item.reuse) {
    const row = await prisma.rubricLibraryItem.create({ data: { ...rubricData(v.rubric), agencyId, status: 'draft', source: 'ai', originPositionId: p.id, createdBy: by }, select: { id: true } })
    refId = row.id
  } else {
    await prisma.rubricLibraryItem.update({ where: { id: item.refId }, data: { ...rubricData(v.rubric), status: 'draft', reviewedBy: null, reviewedAt: null } })
  }
  if (item.decision === 'approved') await setSelection(p.id, p.rubricSelection, item.refId, null)  // changed content must be re-approved
  const existingActive = await prisma.rubricLibraryItem.findMany({ where: { agencyId, status: 'active', NOT: { id: refId } }, select: { subSkill: true } })
  await setItem(p.id, state, item.id, {
    refId, reuse: false, decision: 'pending', decidedBy: null, decidedAt: null,
    flags: [...(state.jdThin ? ['The JD is thin — the AI had little to go on.'] : []), ...rubricFlags({ ...v.rubric, tier: item.tier }, p, existingActive)],
    confidence: Math.max(item.confidence, 0.6),   // a human edited it; keep content flags, drop the model-confidence flag
  })
  return { ok: true as const }
}

/** Edit a task draft (prompt, tests, starter, reference, rubric). Verification is reset. */
export async function editTask(positionId: string, agencyId: string, itemId: string, raw: Record<string, unknown>) {
  const { p, state, item } = await withItem(positionId, agencyId, itemId)
  if (!p || !item || item.kind !== 'task') return fail(404, 'Task item not found')
  if (item.reuse) return fail(400, 'This is a reviewed task bank task — edit it in the Task bank, or regenerate a new draft here.')
  const t = await prisma.taskBankItem.findFirst({ where: { id: item.refId, agencyId } })
  if (!t) return fail(404, 'The task no longer exists.')
  const v = sanitizeTaskInput({ ...t, starterCode: t.starterCode, tests: t.tests, ...raw, roles: t.roles })
  if (!v.ok) return fail(400, v.error)
  const rubric = sanitizeRubric(raw.rubric ?? {})
  await prisma.taskBankItem.update({
    where: { id: t.id },
    data: {
      title: v.task.title, prompt: v.task.prompt, starterCode: v.task.starterCode as Prisma.InputJsonValue, tests: v.task.tests as unknown as Prisma.InputJsonValue,
      referenceSolution: v.task.referenceSolution, minutes: v.task.minutes, status: 'draft', lastVerifiedAt: null, reviewedBy: null, reviewedAt: null,
      ...(raw.rubric ? { rubric: { upsert: { create: { criteria: rubric.criteria as unknown as Prisma.InputJsonValue, probes: rubric.probes as unknown as Prisma.InputJsonValue }, update: { criteria: rubric.criteria as unknown as Prisma.InputJsonValue, probes: rubric.probes as unknown as Prisma.InputJsonValue } } } } : {}),
    },
  })
  const ws = p.workSampleTask as { bankTaskId?: string } | null
  if (item.decision === 'approved' && ws?.bankTaskId === t.id) await prisma.position.update({ where: { id: p.id }, data: { workSampleTask: Prisma.DbNull } })
  await setItem(p.id, state, item.id, {
    decision: 'pending', decidedBy: null, decidedAt: null,
    flags: taskFlags({ verified: false, testCount: v.task.tests.length, droppedTests: 0, hasReference: !!v.task.referenceSolution.trim(), judge0: judge0Configured() }),
  })
  return { ok: true as const }
}

export async function verifyTask(positionId: string, agencyId: string, itemId: string) {
  const { p, state, item } = await withItem(positionId, agencyId, itemId)
  if (!p || !item || item.kind !== 'task') return fail(404, 'Task item not found')
  const v = await verifyTaskRow(item.refId)
  const t = await prisma.taskBankItem.findUnique({ where: { id: item.refId }, select: { tests: true, referenceSolution: true } })
  await setItem(p.id, state, item.id, { flags: taskFlags({ verified: v.ok, testCount: sanitizeTests(t?.tests).length, droppedTests: 0, hasReference: !!t?.referenceSolution?.trim(), judge0: judge0Configured() }) })
  return { ok: true as const, verified: v.ok, note: v.note }
}

/** Regenerate ONE item (optionally steered by the moderator's instruction). */
export async function regenerateItem(positionId: string, agencyId: string, by: string, itemId: string, instruction?: string) {
  const { p, state, item } = await withItem(positionId, agencyId, itemId)
  if (!p || !item) return fail(404, 'Item not found')
  const ctx = await contextFor(p, agencyId)
  try {
    let fresh: CalibrationItem
    if (item.kind === 'rubric') {
      const r = await prisma.rubricLibraryItem.findFirst({ where: { id: item.refId, agencyId }, select: RUBRIC_CONTENT_SELECT })
      const prev = r ? rowToContent(r) : null
      const d = await generateOneRubric(ctx, { competency: prev?.subSkill ?? 'the same competency', instruction, previous: prev })
      if (item.decision === 'approved') await setSelection(p.id, p.rubricSelection, item.refId, null)
      fresh = await rubricItemFromDraft({ ...d, tier: item.tier ?? d.tier }, p, agencyId, by, ctx.existing, item.reuse ? null : item.refId)
    } else {
      const old = await prisma.taskBankItem.findFirst({ where: { id: item.refId, agencyId }, select: { title: true } })
      const td = await generateTaskDraft(ctx, { instruction, previousTitle: old?.title })
      fresh = await taskItemFromDraft(td, p, agencyId, by, item.reuse ? null : item.refId)
    }
    if (state.jdThin) fresh.flags.unshift('The JD is thin — the AI had little to go on.')
    await saveState(p.id, { ...state, items: state.items.map((i) => (i.id === item.id ? { ...fresh, id: item.id } : i)) })
    return { ok: true as const }
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : 'Regeneration failed.')
  }
}

/** Add an item: AI-drafted rubric for a named competency, an AI task, or an existing library rubric. */
export async function addItem(positionId: string, agencyId: string, by: string, body: { type: 'rubric_ai' | 'task_ai' | 'rubric_existing'; competency?: string; tier?: RubricTier; rubricId?: string; instruction?: string }) {
  const p = await loadPosition(positionId, agencyId)
  if (!p) return fail(404, 'Position not found')
  const state = readState(p.calibration)
  const ctx = await contextFor(p, agencyId)
  try {
    let it: CalibrationItem
    if (body.type === 'rubric_existing') {
      const r = await prisma.rubricLibraryItem.findFirst({ where: { id: body.rubricId ?? '', agencyId } })
      if (!r) return fail(404, 'Rubric not found in your library.')
      if (state.items.some((i) => i.refId === r.id && i.decision !== 'rejected')) return fail(400, 'That rubric is already in this set.')
      const tier = body.tier ?? 'good'
      it = {
        id: newId(), kind: 'rubric', refId: r.id, reuse: r.status === 'active', tier, proposedTier: tier,
        reasoning: 'Added by the moderator from the rubric library.', tierReason: '', confidence: 1, uncertainty: '',
        flags: r.status === 'active' ? [] : ['This library rubric is not active yet — review its content before approving.'],
        decision: 'pending', note: null, decidedBy: null, decidedAt: null, updatedAt: now(),
      }
    } else if (body.type === 'rubric_ai') {
      const competency = (body.competency ?? '').trim().slice(0, 120)
      if (!competency) return fail(400, 'Name the competency to draft.')
      const d = await generateOneRubric(ctx, { competency, instruction: body.instruction })
      it = await rubricItemFromDraft({ ...d, tier: body.tier ?? d.tier }, p, agencyId, by, ctx.existing)
    } else {
      it = await taskItemFromDraft(await generateTaskDraft(ctx, { instruction: body.instruction }), p, agencyId, by)
    }
    await saveState(p.id, { ...state, status: state.status === 'idle' ? 'ready' : state.status, items: [...state.items, it] })
    return { ok: true as const }
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : 'Drafting failed.')
  }
}
