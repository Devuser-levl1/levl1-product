import type { WorkspaceLanguage } from './task'

// ── Judge0 execution client (Screen-scoped, SERVER-ONLY) ───────────────────
// Candidate code runs in Judge0's sandbox — NEVER on our servers.
//
// Provider: Judge0 CE hosted via RapidAPI. Backend-proxied only — the key is
// read from server env and never exposed to the browser (no NEXT_PUBLIC_*).
//   JUDGE0_API_KEY   RapidAPI key                 → X-RapidAPI-Key   (required)
//   JUDGE0_API_HOST  judge0-ce.p.rapidapi.com     → X-RapidAPI-Host  (also the base URL host)
//
// Self-host seam (later volume optimisation): set JUDGE0_API_URL to your own
// Judge0 instance (+ JUDGE0_AUTH_TOKEN if it has AUTHN). No code change.

if (typeof window !== 'undefined') {
  throw new Error('lib/screen/workspace/judge0 is server-only — call /api/interview/workspace/run instead.')
}

const RAPIDAPI_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com'
const BASE_URL = (process.env.JUDGE0_API_URL || `https://${RAPIDAPI_HOST}`).replace(/\/+$/, '')

// Judge0 CE language ids.
const LANGUAGE_ID: Record<WorkspaceLanguage, number> = {
  python: 71,      // Python 3.8
  javascript: 63,  // Node.js 12
  typescript: 74,  // TypeScript 3.7
  java: 62,        // OpenJDK 13 (class must be named Main)
  cpp: 54,         // GCC 9.2
  go: 60,          // Go 1.13
  sql: 82,         // SQLite 3.27 — source = test setup SQL + candidate query (see executionPlan)
}

export interface ExecResult {
  status: 'ok' | 'compile_error' | 'runtime_error' | 'timeout' | 'error'
  statusText: string
  stdout: string
  stderr: string
  compileOutput: string
  timeSec: number | null
  memoryKb: number | null
}

export function judge0Configured(): boolean {
  return !!(process.env.JUDGE0_API_KEY || (process.env.JUDGE0_API_URL && process.env.JUDGE0_AUTH_TOKEN))
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')
const unb64 = (s: unknown) => (typeof s === 'string' && s ? Buffer.from(s, 'base64').toString('utf8') : '')

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.JUDGE0_API_KEY) {
    h['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY
    h['X-RapidAPI-Host'] = RAPIDAPI_HOST
  }
  if (process.env.JUDGE0_AUTH_TOKEN && process.env.JUDGE0_AUTH_TOKEN !== 'none') h['X-Auth-Token'] = process.env.JUDGE0_AUTH_TOKEN
  return h
}

/** One sandboxed execution (synchronous wait). Limits are conservative for interview tasks. */
export async function execute(opts: { language: WorkspaceLanguage; source: string; stdin?: string }): Promise<ExecResult> {
  const base = BASE_URL
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const res = await fetch(`${base}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,status,time,memory`, {
      method: 'POST',
      headers: headers(),
      signal: ctrl.signal,
      body: JSON.stringify({
        language_id: LANGUAGE_ID[opts.language],
        source_code: b64(opts.source),
        stdin: b64(opts.stdin ?? ''),
        cpu_time_limit: 3,
        wall_time_limit: 6,
        memory_limit: 256_000,
        enable_network: false,
      }),
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 200)
      console.warn('[judge0] HTTP', res.status, detail)
      return { status: 'error', statusText: res.status === 429 ? 'Execution limit reached — try again in a moment' : 'Execution service unavailable', stdout: '', stderr: '', compileOutput: '', timeSec: null, memoryKb: null }
    }
    const d = (await res.json()) as { stdout?: string; stderr?: string; compile_output?: string; status?: { id?: number; description?: string }; time?: string | null; memory?: number | null }
    const id = d.status?.id ?? 13
    // 3 Accepted · 4 Wrong Answer (n/a without expected_output) · 5 TLE · 6 Compilation Error · 7–12 runtime errors · 13/14 internal
    const status: ExecResult['status'] = id === 3 || id === 4 ? 'ok' : id === 5 ? 'timeout' : id === 6 ? 'compile_error' : id >= 7 && id <= 12 ? 'runtime_error' : 'error'
    return {
      status,
      statusText: d.status?.description ?? 'Unknown',
      stdout: unb64(d.stdout).slice(0, 20_000),
      stderr: unb64(d.stderr).slice(0, 8_000),
      compileOutput: unb64(d.compile_output).slice(0, 8_000),
      timeSec: d.time != null ? Number(d.time) : null,
      memoryKb: d.memory ?? null,
    }
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError'
    return { status: aborted ? 'timeout' : 'error', statusText: aborted ? 'Timed out' : 'Execution service unavailable', stdout: '', stderr: '', compileOutput: '', timeSec: null, memoryKb: null }
  } finally {
    clearTimeout(timer)
  }
}
