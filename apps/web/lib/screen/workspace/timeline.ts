// ── Work-capture timeline (Screen-scoped, isomorphic) ──────────────────────
// HOW the candidate's solution evolved — the "observe" data. The browser
// records compact events; the server validates + caps them; digest() turns
// them into evidence-linked moments (M1, M2…) used by grounded follow-ups,
// judgment scoring and integrity review.

export type TimelineKind = 'open' | 'edit' | 'paste' | 'run' | 'tests' | 'lang' | 'format' | 'snapshot' | 'submit'

export interface TimelineEvent {
  t: number            // ms since the workspace opened for this task
  k: TimelineKind
  n?: number           // edit: chars typed (net) in the window · paste: chars pasted
  d?: number           // edit: chars deleted in the window
  ok?: boolean         // run/tests: executed without error
  passed?: number      // tests
  total?: number       // tests
  lang?: string        // lang / open
  code?: string        // snapshot only (capped)
}

export const MAX_EVENTS = 1500
export const MAX_SNAPSHOTS = 40
export const SNAPSHOT_MAX_CHARS = 12_000
const KINDS = new Set<TimelineKind>(['open', 'edit', 'paste', 'run', 'tests', 'lang', 'format', 'snapshot', 'submit'])

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : undefined)

/** Untrusted browser events → validated events. */
export function sanitizeEvents(raw: unknown): TimelineEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 400).flatMap((e) => {
    const o = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>
    const k = o.k as TimelineKind
    const t = num(o.t)
    if (!KINDS.has(k) || t === undefined || (o.t as number) < 0 || t > 6 * 3600_000) return []
    const ev: TimelineEvent = { t, k }
    const n = num(o.n); if (n !== undefined) ev.n = Math.min(n, 1_000_000)
    const d = num(o.d); if (d !== undefined) ev.d = Math.min(d, 1_000_000)
    if (typeof o.ok === 'boolean') ev.ok = o.ok
    const p = num(o.passed); if (p !== undefined) ev.passed = Math.min(p, 100)
    const tot = num(o.total); if (tot !== undefined) ev.total = Math.min(tot, 100)
    if (typeof o.lang === 'string') ev.lang = o.lang.slice(0, 20)
    if (k === 'snapshot' && typeof o.code === 'string') ev.code = o.code.slice(0, SNAPSHOT_MAX_CHARS)
    return [ev]
  })
}

/** Merge new events into the stored list, keeping chronology and the caps. */
export function mergeEvents(stored: TimelineEvent[], incoming: TimelineEvent[]): TimelineEvent[] {
  const all = [...stored, ...incoming].sort((a, b) => a.t - b.t)
  let snaps = all.filter((e) => e.k === 'snapshot').length
  const kept = all.filter((e) => {
    if (e.k !== 'snapshot' || snaps <= MAX_SNAPSHOTS) return true
    snaps--; return false   // drop the OLDEST snapshots first
  })
  return kept.slice(-MAX_EVENTS)
}

const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

/** Line-set similarity (0–1) — cheap "how much of the code survived" measure. */
function similarity(a: string, b: string): number {
  const A = new Set(a.split('\n').map((l) => l.trim()).filter(Boolean))
  const B = new Set(b.split('\n').map((l) => l.trim()).filter(Boolean))
  if (!A.size && !B.size) return 1
  let inter = 0
  A.forEach((l) => { if (B.has(l)) inter++ })
  return inter / Math.max(A.size, B.size)
}

export interface Moment { id: string; at: string; kind: 'start' | 'paste' | 'rewrite' | 'abandon' | 'first_run' | 'tests' | 'all_pass' | 'lang' | 'submit'; note: string }

export interface TimelineDigest {
  durationMs: number
  timeToFirstEditMs: number | null
  typedChars: number
  deletedChars: number
  pastes: { count: number; largest: number; total: number }
  runs: number
  testRuns: number
  bestPassRate: number | null      // 0–1 across test runs
  firstAllPassAt: string | null
  languageSwitches: number
  rewrites: number
  moments: Moment[]
  text: string                     // compact prompt-ready summary
}

export function digest(events: TimelineEvent[]): TimelineDigest {
  const ev = [...events].sort((a, b) => a.t - b.t)
  const moments: Moment[] = []
  const push = (t: number, kind: Moment['kind'], note: string) => moments.push({ id: `M${moments.length + 1}`, at: mmss(t), kind, note })
  let typed = 0, deleted = 0, runs = 0, testRuns = 0, langSwitch = 0, rewrites = 0
  let firstEdit: number | null = null, firstRun: number | null = null, firstAllPass: number | null = null
  let best: number | null = null
  const pastes = { count: 0, largest: 0, total: 0 }
  let prevSnap: { t: number; code: string } | null = null

  for (const e of ev) {
    if (e.k === 'edit') { typed += e.n ?? 0; deleted += e.d ?? 0; if (firstEdit === null && ((e.n ?? 0) > 0 || (e.d ?? 0) > 0)) firstEdit = e.t }
    if (e.k === 'paste') {
      pastes.count++; pastes.total += e.n ?? 0; pastes.largest = Math.max(pastes.largest, e.n ?? 0)
      if ((e.n ?? 0) >= 200) push(e.t, 'paste', `Pasted a ${e.n}-character block`)
    }
    if (e.k === 'run') { runs++; if (firstRun === null) { firstRun = e.t; push(e.t, 'first_run', `First run${e.ok === false ? ' (errored)' : ''}`) } }
    if (e.k === 'tests') {
      testRuns++
      const rate = e.total ? (e.passed ?? 0) / e.total : 0
      best = best === null ? rate : Math.max(best, rate)
      if (e.total && e.passed === e.total && firstAllPass === null) { firstAllPass = e.t; push(e.t, 'all_pass', `All ${e.total} tests passing`) }
      else push(e.t, 'tests', `Tests: ${e.passed ?? 0}/${e.total ?? 0} passing`)
    }
    if (e.k === 'lang' && e.t > 0) { langSwitch++; push(e.t, 'lang', `Switched language to ${e.lang}`) }
    if (e.k === 'snapshot' && typeof e.code === 'string') {
      if (prevSnap && prevSnap.code.trim().length > 80) {
        const sim = similarity(prevSnap.code, e.code)
        if (e.code.trim().length < prevSnap.code.trim().length * 0.4) push(e.t, 'abandon', `Deleted most of the code (~${Math.round((1 - e.code.length / Math.max(1, prevSnap.code.length)) * 100)}%) — dropped an approach`)
        else if (sim < 0.5) { rewrites++; push(e.t, 'rewrite', `Rewrote ~${Math.round((1 - sim) * 100)}% of the code — changed approach`) }
      }
      prevSnap = { t: e.t, code: e.code }
    }
    if (e.k === 'submit') push(e.t, 'submit', 'Submitted the solution')
  }
  const durationMs = ev.length ? ev[ev.length - 1].t : 0
  if (firstEdit !== null) moments.unshift({ id: 'M0', at: mmss(firstEdit), kind: 'start', note: 'Started writing code' })
  moments.forEach((m, i) => { m.id = `M${i + 1}` })

  const lines = [
    `Time on task ${mmss(durationMs)}; first edit at ${firstEdit === null ? '—' : mmss(firstEdit)}.`,
    `Typed ~${typed} chars, deleted ~${deleted}. Runs: ${runs}. Test runs: ${testRuns}${best !== null ? `, best ${Math.round(best * 100)}% passing` : ''}${firstAllPass !== null ? `, all passing at ${mmss(firstAllPass)}` : ''}.`,
    `Pastes: ${pastes.count}${pastes.count ? ` (largest ${pastes.largest} chars)` : ''}. Approach changes: ${rewrites}.`,
    ...moments.map((m) => `${m.id} @${m.at} — ${m.note}`),
  ]
  return {
    durationMs, timeToFirstEditMs: firstEdit, typedChars: typed, deletedChars: deleted, pastes, runs, testRuns,
    bestPassRate: best, firstAllPassAt: firstAllPass === null ? null : mmss(firstAllPass), languageSwitches: langSwitch, rewrites,
    moments: moments.slice(0, 30), text: lines.join('\n').slice(0, 3000),
  }
}
