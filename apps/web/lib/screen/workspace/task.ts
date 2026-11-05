// ── Work-sample task (Screen-scoped, isomorphic) ───────────────────────────
// A real-world task the candidate solves in the workspace. Tests are
// stdin → stdout, so they are language-agnostic and run unchanged in Judge0
// for any supported language. Hidden tests are executed but their input /
// expected output never reach the browser (see publicTask()).

// SQL is not offered: Judge0 runs SQLite scripts without stdin, so stdin→stdout
// tests can't apply. SQL-heavy roles get a Python task (pandas-free, stdlib only).
export const WORKSPACE_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'go'] as const
export type WorkspaceLanguage = (typeof WORKSPACE_LANGUAGES)[number]

export const LANGUAGE_LABEL: Record<WorkspaceLanguage, string> = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', java: 'Java', cpp: 'C++', go: 'Go',
}

export interface TaskTest { id: string; name: string; input: string; expected: string; hidden: boolean }

export interface WorkSampleTask {
  title: string
  prompt: string            // plain text, what to build + input/output format
  language: WorkspaceLanguage
  starterCode: string       // for `language`
  minutes: number           // suggested time box (the interview time-up gate still rules)
  tests: TaskTest[]
  // Recruiter-facing guidance for scoring/follow-ups (never sent to the candidate).
  lookFor: string[]         // what a strong approach looks like
  probeAngles: string[]     // decision points worth defending
  // Technical content structure — provenance + live-use gate + rubric.
  // NONE of these reach the candidate (publicTask strips them).
  source: 'bank' | 'generated' | 'manual'
  bankTaskId: string | null
  approved: boolean         // only approved tasks are used in live interviews
  approvedBy: string | null
  skills: string[]
  rubric: unknown           // lib/screen/taskbank/types.ts Rubric (sanitizeRubric at use)
}

/** What the candidate's browser may see. */
export interface PublicTask {
  title: string; prompt: string; language: WorkspaceLanguage; starterCode: string; minutes: number
  tests: { id: string; name: string; input: string; expected: string }[]   // visible tests only
  hiddenCount: number
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').slice(0, max) : '')
export const isWorkspaceLanguage = (v: unknown): v is WorkspaceLanguage => typeof v === 'string' && (WORKSPACE_LANGUAGES as readonly string[]).includes(v)

export function sanitizeTask(raw: unknown): WorkSampleTask | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = str(o.title, 120).trim()
  const prompt = str(o.prompt, 4000).trim()
  if (!title || !prompt) return null
  const tests = (Array.isArray(o.tests) ? o.tests : []).slice(0, 12).flatMap((t, i) => {
    const r = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>
    const expected = str(r.expected, 4000)
    if (!expected.trim()) return []
    return [{
      id: str(r.id, 40).trim() || `t${i + 1}`,
      name: str(r.name, 80).trim() || `Test ${i + 1}`,
      input: str(r.input, 8000),
      expected,
      hidden: r.hidden === true,
    }]
  })
  const list = (v: unknown) => (Array.isArray(v) ? v : []).map((x) => str(x, 240).trim()).filter(Boolean).slice(0, 8)
  const minutes = Math.round(Number(o.minutes))
  return {
    title, prompt,
    language: isWorkspaceLanguage(o.language) ? o.language : 'python',
    starterCode: str(o.starterCode, 8000),
    minutes: Number.isFinite(minutes) ? Math.min(20, Math.max(5, minutes)) : 10,
    tests,
    lookFor: list(o.lookFor),
    probeAngles: list(o.probeAngles),
    source: o.source === 'bank' || o.source === 'manual' ? o.source : 'generated',
    bankTaskId: typeof o.bankTaskId === 'string' ? o.bankTaskId.slice(0, 40) : null,
    // Bank tasks are human-reviewed before they can be selected; generated
    // tasks need an explicit recruiter approval. Missing flag = NOT approved.
    approved: o.approved === true,
    approvedBy: typeof o.approvedBy === 'string' ? o.approvedBy.slice(0, 120) : null,
    skills: (Array.isArray(o.skills) ? o.skills : []).filter((x): x is string => typeof x === 'string').slice(0, 12),
    rubric: o.rubric ?? null,
  }
}

export function publicTask(t: WorkSampleTask): PublicTask {
  const visible = t.tests.filter((x) => !x.hidden)
  return {
    title: t.title, prompt: t.prompt, language: t.language, starterCode: t.starterCode, minutes: t.minutes,
    tests: visible.map(({ id, name, input, expected }) => ({ id, name, input, expected })),
    hiddenCount: t.tests.length - visible.length,
  }
}

/** Output comparison used for pass/fail: trailing whitespace per line + final newline are ignored. */
export function outputsMatch(actual: string, expected: string): boolean {
  const norm = (s: string) => s.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '')
  return norm(actual) === norm(expected)
}
