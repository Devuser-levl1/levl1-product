import { isWorkspaceLanguage, type TaskTest, type WorkspaceLanguage } from '@/lib/screen/workspace/task'

// ── Technical content structure (Screen-scoped, isomorphic) ────────────────
// Shapes + sanitizers for the Task Bank, per-task Rubric and Role Skill Map.
// Used by the admin APIs (untrusted input), the selection / coverage logic
// and the admin UI.

export const ROLE_KEYS = ['backend', 'frontend', 'fullstack', 'data', 'devops', 'mobile', 'ml'] as const
export type RoleKey = (typeof ROLE_KEYS)[number]
export const ROLE_LABEL: Record<RoleKey, string> = {
  backend: 'Backend', frontend: 'Frontend', fullstack: 'Full-stack', data: 'Data', devops: 'DevOps / SRE', mobile: 'Mobile', ml: 'ML / AI',
}
export const isRoleKey = (v: unknown): v is RoleKey => typeof v === 'string' && (ROLE_KEYS as readonly string[]).includes(v)

export const DIFFICULTIES = ['junior', 'mid', 'senior'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
/** Default experience band per difficulty (editable per task). */
export const DIFFICULTY_BAND: Record<Difficulty, { min: number; max: number }> = {
  junior: { min: 0, max: 3 }, mid: { min: 2, max: 7 }, senior: { min: 6, max: 40 },
}

// draft → reviewed (a human who hires for the role checked it) → active (eligible for live use)
export const TASK_STATUSES = ['draft', 'reviewed', 'active', 'retired'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const RUBRIC_DIMENSIONS = ['correctness', 'efficiency', 'edge_cases', 'code_quality', 'structure'] as const
export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number]
export const DIMENSION_LABEL: Record<RubricDimension, string> = {
  correctness: 'Correctness', efficiency: 'Efficiency', edge_cases: 'Edge cases', code_quality: 'Code quality', structure: 'Structure',
}

export interface RubricCriterion { id: string; dimension: RubricDimension; strong: string; weak: string; weight: number }
export interface RubricProbe { id: string; decision: string; question: string; strongAnswer: string; weakSignals: string }
export interface Rubric { criteria: RubricCriterion[]; probes: RubricProbe[] }

export interface SkillNode {
  id: string; name: string; aliases: string[]
  priority: 1 | 2 | 3            // 1 = core for the role
  dependsOn: string[]            // skill ids that should be solid first
  deeperProbes: string[]         // where to go when the candidate is strong
  adjacent: string[]             // where to move when covered / stuck
}

export interface TaskInput {
  title: string; prompt: string; roles: RoleKey[]; skills: string[]
  difficulty: Difficulty; experienceMin: number; experienceMax: number
  languages: WorkspaceLanguage[]; starterCode: Partial<Record<WorkspaceLanguage, string>>
  tests: TaskTest[]; referenceSolution: string; referenceLanguage: WorkspaceLanguage; minutes: number
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').slice(0, max) : '')
const slug = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const list = (v: unknown, max = 20, each = 60) => (Array.isArray(v) ? v : []).map((x) => str(x, each).trim()).filter(Boolean).slice(0, max)
const int = (v: unknown, d: number, lo: number, hi: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d }

export function sanitizeTests(raw: unknown): TaskTest[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 20).flatMap((t, i) => {
    const o = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>
    const expected = str(o.expected, 4000)
    if (!expected.trim()) return []
    return [{ id: slug(str(o.id, 40)) || `t${i + 1}`, name: str(o.name, 80).trim() || `Test ${i + 1}`, input: str(o.input, 8000), expected, hidden: o.hidden === true }]
  })
}

/** Untrusted task body → validated input (null = missing essentials). */
export function sanitizeTaskInput(raw: unknown): { ok: true; task: TaskInput } | { ok: false; error: string } {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const title = str(o.title, 120).trim()
  const prompt = str(o.prompt, 6000).trim()
  if (!title || !prompt) return { ok: false, error: 'A task needs a title and a problem statement.' }
  const roles = list(o.roles).filter(isRoleKey) as RoleKey[]
  if (!roles.length) return { ok: false, error: 'Pick at least one role.' }
  const difficulty = (DIFFICULTIES as readonly string[]).includes(o.difficulty as string) ? (o.difficulty as Difficulty) : 'mid'
  const band = DIFFICULTY_BAND[difficulty]
  const expMin = int(o.experienceMin, band.min, 0, 40)
  const expMax = int(o.experienceMax, band.max, 0, 40)
  const languages = list(o.languages).filter(isWorkspaceLanguage) as WorkspaceLanguage[]
  const starterRaw = (o.starterCode && typeof o.starterCode === 'object' ? o.starterCode : {}) as Record<string, unknown>
  const starterCode: Partial<Record<WorkspaceLanguage, string>> = {}
  for (const [k, v] of Object.entries(starterRaw)) if (isWorkspaceLanguage(k)) starterCode[k] = str(v, 8000)
  return {
    ok: true,
    task: {
      title, prompt, roles,
      skills: Array.from(new Set(list(o.skills, 12).map(slug).filter(Boolean))),
      difficulty, experienceMin: Math.min(expMin, expMax), experienceMax: Math.max(expMin, expMax),
      languages: languages.length ? languages : ['python'],
      starterCode, tests: sanitizeTests(o.tests),
      referenceSolution: str(o.referenceSolution, 16000),
      referenceLanguage: isWorkspaceLanguage(o.referenceLanguage) ? o.referenceLanguage : 'python',
      minutes: int(o.minutes, 10, 5, 30),
    },
  }
}

export function sanitizeRubric(raw: unknown): Rubric {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const criteria = (Array.isArray(o.criteria) ? o.criteria : []).slice(0, 15).flatMap((c, i) => {
    const r = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>
    const dimension = (RUBRIC_DIMENSIONS as readonly string[]).includes(r.dimension as string) ? (r.dimension as RubricDimension) : null
    const strong = str(r.strong, 600).trim(); const weak = str(r.weak, 600).trim()
    if (!dimension || (!strong && !weak)) return []
    return [{ id: slug(str(r.id, 40)) || `c${i + 1}`, dimension, strong, weak, weight: int(r.weight, 1, 1, 3) }]
  })
  const probes = (Array.isArray(o.probes) ? o.probes : []).slice(0, 10).flatMap((p, i) => {
    const r = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>
    const decision = str(r.decision, 200).trim(); const question = str(r.question, 300).trim(); const strongAnswer = str(r.strongAnswer, 800).trim()
    if (!decision || !strongAnswer) return []
    return [{ id: slug(str(r.id, 40)) || `p${i + 1}`, decision, question: question || `Why did you choose ${decision}?`, strongAnswer, weakSignals: str(r.weakSignals, 600).trim() }]
  })
  return { criteria, probes }
}

export function sanitizeSkillMap(raw: unknown): SkillNode[] {
  const seen = new Set<string>()
  return (Array.isArray(raw) ? raw : []).slice(0, 40).flatMap((s) => {
    const r = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>
    const name = str(r.name, 60).trim()
    const id = slug(str(r.id, 40) || name)
    if (!name || !id || seen.has(id)) return []
    seen.add(id)
    const pr = int(r.priority, 2, 1, 3) as 1 | 2 | 3
    return [{
      id, name, priority: pr,
      aliases: list(r.aliases, 12, 40).map((a) => a.toLowerCase()),
      dependsOn: list(r.dependsOn, 6).map(slug), adjacent: list(r.adjacent, 6).map(slug),
      deeperProbes: list(r.deeperProbes, 6, 200),
    }]
  })
}
