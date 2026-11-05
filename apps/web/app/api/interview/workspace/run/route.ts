import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { loadWorkspaceSession, MAX_CODE_CHARS, MAX_EXECUTIONS } from '@/lib/screen/workspace/session'
import { execute, judge0Configured, type ExecResult } from '@/lib/screen/workspace/judge0'
import { isWorkspaceLanguage, outputsMatch } from '@/lib/screen/workspace/task'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Run code / run tests (Judge0 proxy) ────────────────────────────────────
// POST { interviewId, code, language, kind: 'run' | 'tests', stdin? }
// The Judge0 key stays server-side; candidate code executes ONLY in Judge0's
// sandbox. Hidden tests return pass/fail only — never their input/expected.
// Per-interview execution cap (WORKSPACE_MAX_EXECUTIONS, default 60).

type RunRecord = { at: string; kind: 'run' | 'tests'; status: string; passed?: number; total?: number; ms?: number | null }

const briefOutput = (r: ExecResult) => ({ status: r.status, statusText: r.statusText, stdout: r.stdout, stderr: r.stderr, compileOutput: r.compileOutput, timeSec: r.timeSec })

export async function POST(req: NextRequest) {
  try {
    if (!judge0Configured()) return NextResponse.json({ error: 'execution_unavailable', message: 'Code execution isn\'t set up yet. You can still write and submit your solution.' }, { status: 503 })
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const interviewId = typeof body.interviewId === 'string' ? body.interviewId.trim() : ''
    const s = await loadWorkspaceSession(interviewId)
    if (!s) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    if (!s.task) return NextResponse.json({ error: 'no_workspace' }, { status: 409 })
    if (!s.live) return NextResponse.json({ error: 'not_live' }, { status: 409 })

    const code = typeof body.code === 'string' ? body.code : ''
    if (!code.trim()) return NextResponse.json({ error: 'empty', message: 'Write some code first.' }, { status: 400 })
    if (code.length > MAX_CODE_CHARS) return NextResponse.json({ error: 'code_too_large' }, { status: 413 })
    const language = isWorkspaceLanguage(body.language) ? body.language : s.task.language
    const kind = body.kind === 'tests' ? 'tests' : 'run'
    const tests = s.task.tests
    const need = kind === 'tests' ? tests.length : 1

    const row = await prisma.interviewWorkSample.findUnique({ where: { interviewId }, select: { execCount: true, runs: true } })
    const used = row?.execCount ?? 0
    if (used + need > MAX_EXECUTIONS) return NextResponse.json({ error: 'limit', message: 'You\'ve reached the run limit for this interview. Submit your solution when ready.' }, { status: 429 })

    const started = Date.now()
    let response: Record<string, unknown>
    let record: RunRecord
    let lastTests: Prisma.InputJsonValue | undefined

    if (kind === 'run') {
      const stdin = typeof body.stdin === 'string' ? body.stdin.slice(0, 8000) : (tests.find((t) => !t.hidden)?.input ?? '')
      const r = await execute({ language, source: code, stdin })
      response = { kind, ...briefOutput(r) }
      record = { at: new Date().toISOString(), kind, status: r.status, ms: r.timeSec != null ? Math.round(r.timeSec * 1000) : null }
    } else {
      // Run tests with modest parallelism.
      const results: { id: string; name: string; hidden: boolean; passed: boolean; status: string; actual?: string; expected?: string; input?: string; stderr?: string }[] = []
      for (let i = 0; i < tests.length; i += 3) {
        const batch = tests.slice(i, i + 3)
        const outs = await Promise.all(batch.map((t) => execute({ language, source: code, stdin: t.input })))
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
      record = { at: new Date().toISOString(), kind, status: passed === results.length ? 'all_pass' : 'some_fail', passed, total: results.length, ms: Date.now() - started }
      lastTests = results.map(({ id, name, hidden, passed: p, status }) => ({ id, name, hidden, passed: p, status }))
    }

    const runs = [...(Array.isArray(row?.runs) ? (row!.runs as RunRecord[]) : []), record].slice(-200)
    await prisma.interviewWorkSample.upsert({
      where: { interviewId },
      update: { execCount: { increment: need }, runs: runs as unknown as Prisma.InputJsonValue, language, ...(lastTests ? { lastTests } : {}) },
      create: { interviewId, task: s.task as unknown as Prisma.InputJsonValue, language, execCount: need, runs: runs as unknown as Prisma.InputJsonValue, ...(lastTests ? { lastTests } : {}) },
    })
    return NextResponse.json({ ...response, executionsLeft: Math.max(0, MAX_EXECUTIONS - used - need) })
  } catch (err) {
    console.error('[workspace/run]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'run_failed', message: 'Couldn\'t run your code. Please try again.' }, { status: 500 })
  }
}
