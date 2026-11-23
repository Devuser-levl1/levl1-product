import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { loadByToken, isWorking, MAX_CODE_CHARS, SOLVE_MAX_EXECUTIONS, DEFENSE_MAX_MINUTES, type LoadedSubmission } from '@/lib/screen/solve/session'
import { publicTask, isWorkspaceLanguage, executionPlan, outputsMatch } from '@/lib/screen/workspace/task'
import { mergeEvents, sanitizeEvents, type TimelineEvent } from '@/lib/screen/workspace/timeline'
import { execute, judge0Configured } from '@/lib/screen/workspace/judge0'
import { openArray, openText, sealJson, sealText } from '@/lib/screen/privacy/fields'
import { readCapturePolicy } from '@/lib/screen/privacy/policy'
import { signVoiceToken } from '@/lib/screen/interview/voice-token'
import { finalizeSubmission, type FinalTestRow } from '@/lib/screen/solve/evaluate'
import { nextDefenseTurn, openerLine, closingLine, type DefenseTurn } from '@/lib/screen/solve/defense'
import { queueSolveReport } from '@/lib/screen/solve/report'
import { recordStageUsage } from '@/lib/screen/solve/usage'
import { SOLVE_NOTICE_VERSION } from '@/lib/screen/solve/notice'
import { askAssistant, AI_MAX_PROMPTS, AI_PROMPT_MAX_CHARS, type AiExchange } from '@/lib/screen/solve/assistant'
import { aiUsageMetrics, aiUsageText } from '@/lib/screen/solve/ai-usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Solve candidate API (token-authenticated, no login) ────────────────────
// GET  → the candidate's view (the task itself only once they've started)
// POST { action: consent | start | save | run | submit | defense_start | defense_answer | voice }
// Every request resolves the submission from the URL token; hidden tests,
// rubric and probe answers never leave the server.

const first = (n: string) => n.trim().split(/\s+/)[0] || n

async function view(s: LoadedSubmission) {
  const row = await prisma.solveSubmission.findUnique({ where: { id: s.id }, select: { code: true, language: true, updatedAt: true, lastTests: true, timeline: true, execCount: true, defenseTranscript: true, aiLog: true, aiPromptCount: true } })
  const tl = row ? openArray<TimelineEvent>(row.timeline) : []
  const started = s.status !== 'invited' && s.status !== 'expired'
  const turns = openArray<DefenseTurn>(row?.defenseTranscript)
  const policy = readCapturePolicy()
  return {
    status: s.status, isDemo: s.isDemo,
    candidateFirstName: first(s.candidateName), positionTitle: s.positionTitle, company: s.company, orgName: s.orgName,
    config: { durationMinutes: s.config.durationMinutes, defenseRequired: s.config.defenseRequired, defenseTiming: s.config.defenseTiming, aiPolicy: s.config.aiPolicy, integrityLevel: s.config.integrityLevel },
    taskTitle: s.task.title, taskMinutes: s.config.durationMinutes,
    expiresAt: s.expiresAt.toISOString(), startedAt: s.startedAt?.toISOString() ?? null, deadlineAt: s.deadlineAt?.toISOString() ?? null,
    submittedAt: s.submittedAt?.toISOString() ?? null, autoSubmitted: s.autoSubmitted, quality: s.submissionQuality,
    consentGiven: s.consentGiven,
    notice: { version: SOLVE_NOTICE_VERSION, retentionDays: policy.transcriptRetentionDays },
    executionAvailable: judge0Configured(),
    task: started ? publicTask(s.task) : null,
    saved: started && row ? { code: openText(row.code) ?? '', language: row.language, savedAt: row.updatedAt.toISOString(), lastTests: row.lastTests ?? null } : null,
    resumeMs: tl.length ? tl[tl.length - 1].t + 1000 : 0,
    executionsLeft: Math.max(0, SOLVE_MAX_EXECUTIONS - (row?.execCount ?? 0)),
    ai: {
      enabled: s.config.aiPolicy === 'allowed',
      remaining: Math.max(0, AI_MAX_PROMPTS - (row?.aiPromptCount ?? 0)),
      exchanges: started && s.config.aiPolicy === 'allowed' ? openArray<AiExchange>(row?.aiLog).map(publicExchange) : [],
    },
    defense: {
      status: s.defenseStatus, deadlineAt: s.defenseDeadlineAt?.toISOString() ?? null,
      turns: turns.map(({ speaker, text }) => ({ speaker, text })),
      voiceAccent: s.voiceAccent,
    },
  }
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const s = await loadByToken(params.token)
  if (!s) return NextResponse.json({ error: 'This link is not valid. It may have been replaced by a newer invite.' }, { status: 404 })
  return NextResponse.json(await view(s))
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const s = await loadByToken(params.token)
    if (!s) return NextResponse.json({ error: 'This link is not valid. It may have been replaced by a newer invite.' }, { status: 404 })
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    switch (body.action) {
      case 'consent': return consent(s, req)
      case 'start': return start(s)
      case 'save': return save(s, body)
      case 'run': return run(s, body)
      case 'submit': return submit(s, body, params.token)
      case 'defense_start': return defenseStart(s)
      case 'defense_answer': return defenseAnswer(s, body)
      case 'voice': return voice(s)
      case 'assist': return assist(s, body)
      case 'voice_event': {
        // Voice/STT failures are logged loudly (never silent) — same events as the room.
        const kind = body.kind === 'stt_failed' ? 'stt_error' : 'voice_upstream_error'
        console.warn(JSON.stringify({ evt: kind, surface: 'solve_defense', solveSubmissionId: s.id, detail: typeof body.detail === 'string' ? body.detail.slice(0, 120) : null }))
        return NextResponse.json({ ok: true })
      }
      default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[solve/t]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Something went wrong. Your saved work is safe; please try again.' }, { status: 500 })
  }
}

async function consent(s: LoadedSubmission, req: NextRequest) {
  const row = await prisma.solveSubmission.findUnique({ where: { id: s.id }, select: { consentLog: true } })
  const log = Array.isArray(row?.consentLog) ? (row!.consentLog as unknown[]) : []
  const at = new Date()
  await prisma.solveSubmission.update({
    where: { id: s.id },
    data: {
      ...(s.consentGiven ? {} : { consentGiven: true, consentAt: at, consentNoticeVersion: SOLVE_NOTICE_VERSION }),
      consentLog: [...log, { kind: 'take_home', at: at.toISOString(), noticeVersion: SOLVE_NOTICE_VERSION, surface: 'solve', userAgent: (req.headers.get('user-agent') ?? '').slice(0, 300) }].slice(-20) as Prisma.InputJsonValue,
    },
  })
  console.info('[consent] acknowledged', JSON.stringify({ solveSubmissionId: s.id, kind: 'take_home', noticeVersion: SOLVE_NOTICE_VERSION }))
  return NextResponse.json({ ok: true, at: at.toISOString() })
}

async function start(s: LoadedSubmission) {
  if (s.status === 'expired') return NextResponse.json({ error: 'This take-home has expired. Contact the hiring team if you need a new link.' }, { status: 410 })
  if (s.status !== 'invited') return NextResponse.json(await view(s))
  if (!s.consentGiven) return NextResponse.json({ error: 'Please confirm the notice first.' }, { status: 409 })
  const now = new Date()
  const deadlineAt = new Date(now.getTime() + s.config.durationMinutes * 60_000)
  const r = await prisma.solveSubmission.updateMany({ where: { id: s.id, status: 'invited' }, data: { status: 'started', startedAt: now, deadlineAt } })
  console.info(JSON.stringify({ evt: 'solve_started', id: s.id, won: r.count === 1 }))
  return NextResponse.json(await view({ ...s, status: 'started', startedAt: now, deadlineAt }))
}

async function save(s: LoadedSubmission, body: Record<string, unknown>) {
  if (!isWorking(s)) return NextResponse.json({ error: 'not_working', status: s.status }, { status: 409 })
  const code = typeof body.code === 'string' ? body.code : null
  if (code !== null && code.length > MAX_CODE_CHARS) return NextResponse.json({ error: 'code_too_large' }, { status: 413 })
  const language = isWorkspaceLanguage(body.language) && s.task.languages.includes(body.language) ? body.language : s.task.language
  const existing = await prisma.solveSubmission.findUnique({ where: { id: s.id }, select: { timeline: true, integrity: true } })
  const timeline = mergeEvents(openArray<TimelineEvent>(existing?.timeline), sanitizeEvents(body.events))
  // Tab-away counters are cumulative on the client; keep the max (never decreases).
  const c = (body.counters && typeof body.counters === 'object' ? body.counters : {}) as Record<string, unknown>
  const prev = (existing?.integrity && typeof existing.integrity === 'object' ? existing.integrity : {}) as Record<string, number>
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0)
  const integrity = { tabSwitches: Math.max(prev.tabSwitches ?? 0, Math.min(n(c.tabSwitches), 10_000)), awayMs: Math.max(prev.awayMs ?? 0, Math.min(n(c.awayMs), 86_400_000)) }
  await prisma.solveSubmission.update({
    where: { id: s.id },
    data: { language, ...(code !== null ? { code: sealText(code) } : {}), timeline: sealJson(timeline), integrity: integrity as Prisma.InputJsonValue },
  })
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
}

type RunRecord = { at: string; kind: 'run' | 'tests'; status: string; passed?: number; total?: number }

async function run(s: LoadedSubmission, body: Record<string, unknown>) {
  if (!judge0Configured()) return NextResponse.json({ error: 'execution_unavailable', message: 'Code execution isn\'t available right now. You can still write and submit your solution.' }, { status: 503 })
  if (!isWorking(s)) return NextResponse.json({ error: 'not_working', message: 'The take-home is no longer open.' }, { status: 409 })
  const code = typeof body.code === 'string' ? body.code : ''
  if (!code.trim()) return NextResponse.json({ error: 'empty', message: 'Write some code first.' }, { status: 400 })
  if (code.length > MAX_CODE_CHARS) return NextResponse.json({ error: 'code_too_large' }, { status: 413 })
  const language = isWorkspaceLanguage(body.language) && s.task.languages.includes(body.language) ? body.language : s.task.language
  const kind = body.kind === 'tests' ? 'tests' : 'run'
  const tests = s.task.tests
  const need = kind === 'tests' ? tests.length : 1
  const row = await prisma.solveSubmission.findUnique({ where: { id: s.id }, select: { execCount: true, runs: true } })
  const used = row?.execCount ?? 0
  if (used + need > SOLVE_MAX_EXECUTIONS) return NextResponse.json({ error: 'limit', message: 'You\'ve reached the run limit. Submit your solution when ready.' }, { status: 429 })

  let response: Record<string, unknown>
  let record: RunRecord
  let lastTests: Prisma.InputJsonValue | undefined
  if (kind === 'run') {
    const stdin = typeof body.stdin === 'string' ? body.stdin.slice(0, 8000) : (tests.find((t) => !t.hidden)?.input ?? '')
    const r = await execute({ language, ...executionPlan(language, code, stdin) })
    response = { kind, status: r.status, statusText: r.statusText, stdout: r.stdout, stderr: r.stderr, compileOutput: r.compileOutput, timeSec: r.timeSec }
    record = { at: new Date().toISOString(), kind, status: r.status }
  } else {
    const results: Record<string, unknown>[] = []
    for (let i = 0; i < tests.length; i += 3) {
      const batch = tests.slice(i, i + 3)
      const outs = await Promise.all(batch.map((t) => execute({ language, ...executionPlan(language, code, t.input) })))
      batch.forEach((t, j) => {
        const r = outs[j]
        const passed = r.status === 'ok' && outputsMatch(r.stdout, t.expected)
        results.push(t.hidden
          ? { id: t.id, name: t.name, hidden: true, passed, status: r.status }
          : { id: t.id, name: t.name, hidden: false, passed, status: r.status, input: t.input, expected: t.expected, actual: r.stdout.slice(0, 4000), stderr: (r.compileOutput || r.stderr).slice(0, 2000) })
      })
    }
    const passed = results.filter((r) => r.passed).length
    response = { kind, passed, total: results.length, results }
    record = { at: new Date().toISOString(), kind, status: passed === results.length ? 'all_pass' : 'some_fail', passed, total: results.length }
    lastTests = results.map(({ id, name, hidden, passed: p, status }) => ({ id, name, hidden, passed: p, status })) as Prisma.InputJsonValue
  }
  const runs = [...(Array.isArray(row?.runs) ? (row!.runs as RunRecord[]) : []), record].slice(-300)
  await prisma.solveSubmission.update({ where: { id: s.id }, data: { execCount: { increment: need }, runs: runs as unknown as Prisma.InputJsonValue, language, ...(lastTests ? { lastTests } : {}) } })
  await recordStageUsage({ agencyId: s.agencyId, stage: 'solve', kind: 'solve_exec', refId: s.id, units: need, isDemo: s.isDemo })
  return NextResponse.json({ ...response, executionsLeft: Math.max(0, SOLVE_MAX_EXECUTIONS - used - need) })
}

async function submit(s: LoadedSubmission, body: Record<string, unknown>, token: string) {
  if (s.status !== 'started') return NextResponse.json(await view(s))   // already submitted (or auto-submitted) — idempotent
  // Final save first so the scored code is exactly what they last had.
  if (typeof body.code === 'string' || Array.isArray(body.events)) {
    const r = await save(s, body)
    if (!r.ok && r.status !== 409) return r
  }
  await finalizeSubmission(s.id)
  const fresh = await loadByToken(token)
  return NextResponse.json(await view(fresh ?? { ...s, status: 'submitted' }))
}

async function readTurns(id: string) {
  const row = await prisma.solveSubmission.findUnique({ where: { id }, select: { defenseTranscript: true, code: true, timeline: true, finalTests: true, language: true, defenseInputMode: true, aiLog: true } })
  return { row, turns: openArray<DefenseTurn>(row?.defenseTranscript) }
}

function voiceToken(id: string) {
  return signVoiceToken(`solve:${id}`, (DEFENSE_MAX_MINUTES + 15) * 60_000).token
}

async function defenseStart(s: LoadedSubmission) {
  if (s.defenseStatus === 'in_progress') {
    const { turns } = await readTurns(s.id)
    return NextResponse.json({ voiceToken: voiceToken(s.id), turns: turns.map(({ speaker, text }) => ({ speaker, text })), say: [...turns].reverse().find((t) => t.speaker === 'ai')?.text ?? null, done: false })
  }
  if (s.defenseStatus !== 'pending') return NextResponse.json({ error: s.defenseStatus === 'expired' ? 'The window for this conversation has closed.' : 'There is no conversation to start.' }, { status: 409 })
  const say = openerLine({ firstName: first(s.candidateName), task: s.task })
  const turns: DefenseTurn[] = [{ speaker: 'ai', text: say, at: new Date().toISOString() }]
  const r = await prisma.solveSubmission.updateMany({ where: { id: s.id, defenseStatus: 'pending' }, data: { defenseStatus: 'in_progress', defenseStartedAt: new Date(), defenseTranscript: sealJson(turns) } })
  if (!r.count) return defenseStart({ ...s, defenseStatus: 'in_progress' })
  console.info(JSON.stringify({ evt: 'solve_defense_started', id: s.id }))
  return NextResponse.json({ voiceToken: voiceToken(s.id), turns: turns.map(({ speaker, text }) => ({ speaker, text })), say, done: false })
}

async function defenseAnswer(s: LoadedSubmission, body: Record<string, unknown>) {
  if (s.defenseStatus !== 'in_progress') return NextResponse.json({ error: 'The conversation is not in progress.' }, { status: 409 })
  const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, 4000) : ''
  const mode = body.mode === 'typed' ? 'typed' : 'voice'
  const { row, turns } = await readTurns(s.id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const now = new Date()
  turns.push({ speaker: 'candidate', text: text || '(no answer)', at: now.toISOString(), mode })
  const inputMode = row.defenseInputMode && row.defenseInputMode !== mode ? 'mixed' : mode

  const overtime = !!s.defenseStartedAt && now.getTime() - s.defenseStartedAt.getTime() > DEFENSE_MAX_MINUTES * 60_000
  const next = overtime
    ? { say: closingLine(first(s.candidateName)), done: true }
    : await (async () => {
      const code = openText(row.code) ?? ''
      const timeline = openArray<TimelineEvent>(row.timeline)
      const exchanges = s.config.aiPolicy === 'allowed' ? openArray<AiExchange>(row.aiLog) : []
      const m = exchanges.length ? aiUsageMetrics(exchanges, timeline, code, s.task.starterCode) : null
      return nextDefenseTurn({
        firstName: first(s.candidateName), task: s.task, language: row.language, code, timeline,
        finalTests: (Array.isArray(row.finalTests) ? row.finalTests : null) as FinalTestRow[] | null,
        aiPolicy: s.config.aiPolicy, maxFollowUps: s.config.defenseQuestions,
        ai: m ? { summary: aiUsageText(exchanges, m, 400).slice(0, 6000), lines: m.aiLines } : null,
      }, turns)
    })()
  turns.push({ speaker: 'ai', text: next.say, at: new Date().toISOString() })
  await prisma.solveSubmission.update({
    where: { id: s.id },
    data: { defenseTranscript: sealJson(turns), defenseInputMode: inputMode, ...(next.done ? { defenseStatus: 'completed', defenseCompletedAt: new Date() } : {}) },
  })
  if (next.done) {
    console.info(JSON.stringify({ evt: 'solve_defense_completed', id: s.id, turns: turns.length, inputMode }))
    await recordStageUsage({ agencyId: s.agencyId, stage: 'solve', kind: 'solve_defense', refId: s.id, isDemo: s.isDemo })
    queueSolveReport(s.id)
  }
  return NextResponse.json({ say: next.say, done: next.done, turns: turns.map(({ speaker, text: t }) => ({ speaker, text: t })) })
}

async function voice(s: LoadedSubmission) {
  if (s.defenseStatus !== 'in_progress') return NextResponse.json({ error: 'not_live' }, { status: 409 })
  return NextResponse.json({ voiceToken: voiceToken(s.id) })
}

const publicExchange = (x: AiExchange) => ({ id: x.id, prompt: x.prompt, response: x.response, blocks: x.blocks, error: x.error ?? null, includedCode: x.includedCode })

// Built-in AI assistant — only when the position allows AI help. Every exchange
// is logged (encrypted) as AI-fluency evidence; the count is capped atomically.
async function assist(s: LoadedSubmission, body: Record<string, unknown>) {
  if (s.config.aiPolicy !== 'allowed') return NextResponse.json({ error: 'The AI assistant isn\'t part of this take-home.' }, { status: 403 })
  if (!isWorking(s)) return NextResponse.json({ error: 'The take-home is no longer open.' }, { status: 409 })
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, AI_PROMPT_MAX_CHARS) : ''
  if (!prompt) return NextResponse.json({ error: 'Ask something first.' }, { status: 400 })
  const code = body.includeCode === true && typeof body.code === 'string' ? body.code.slice(0, MAX_CODE_CHARS) : null
  const t = typeof body.t === 'number' && Number.isFinite(body.t) ? Math.max(0, Math.round(body.t)) : 0
  const language = isWorkspaceLanguage(body.language) && s.task.languages.includes(body.language) ? body.language : s.task.language
  const claimed = await prisma.solveSubmission.updateMany({ where: { id: s.id, aiPromptCount: { lt: AI_MAX_PROMPTS } }, data: { aiPromptCount: { increment: 1 } } })
  if (!claimed.count) return NextResponse.json({ error: `You've used all ${AI_MAX_PROMPTS} assistant questions for this take-home.` }, { status: 429 })
  const row = await prisma.solveSubmission.findUnique({ where: { id: s.id }, select: { aiLog: true, aiPromptCount: true } })
  const log = openArray<AiExchange>(row?.aiLog)
  const x = await askAssistant({ task: s.task, language, prompt, code, history: log, id: `A${log.length + 1}`, t })
  await prisma.solveSubmission.update({ where: { id: s.id }, data: { aiLog: sealJson([...log, x].slice(-60)) } })
  await recordStageUsage({ agencyId: s.agencyId, stage: 'solve', kind: 'solve_ai', refId: s.id, units: 1, isDemo: s.isDemo })
  return NextResponse.json({ exchange: publicExchange(x), remaining: Math.max(0, AI_MAX_PROMPTS - (row?.aiPromptCount ?? 0)) })
}
