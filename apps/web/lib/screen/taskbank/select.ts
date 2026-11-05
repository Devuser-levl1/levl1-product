import { isWorkspaceLanguage, type WorkSampleTask, type WorkspaceLanguage } from '@/lib/screen/workspace/task'
import { sanitizeRubric, sanitizeSkillMap, type RoleKey, type SkillNode } from './types'

// ── Task selection (Screen-scoped, isomorphic) ─────────────────────────────
// Given a position (title, required skills from the JD parse + must-haves,
// experience range), rank ACTIVE bank tasks by: role fit, must-have coverage,
// required-skill overlap, difficulty fit and language fit. Every score comes
// with human-readable reasons so recruiters see WHY a task was chosen.

export interface PositionNeeds {
  title: string
  techStack: string[]           // JD-parsed required skills
  mustHaves: string[]
  experienceMin: number | null
  experienceMax: number | null
}

export interface BankTaskLike {
  id: string; title: string; prompt: string; roles: string[]; skills: string[]
  difficulty: string; experienceMin: number; experienceMax: number; languages: string[]
  starterCode: unknown; tests: unknown; minutes: number; status: string
  rubric?: { criteria: unknown; probes: unknown } | null
}

const ROLE_PATTERNS: [RoleKey, RegExp][] = [
  ['ml', /\b(ml|machine learning|ai engineer|data scientist|deep learning|nlp|computer vision)\b/i],
  ['data', /\b(data engineer|analytics engineer|etl|bi engineer|data platform|data analyst|big data)\b/i],
  ['devops', /\b(devops|sre|site reliability|platform engineer|infrastructure|cloud engineer)\b/i],
  ['mobile', /\b(android|ios|mobile|react native|flutter)\b/i],
  ['fullstack', /\b(full[- ]?stack)\b/i],
  ['frontend', /\b(front[- ]?end|ui engineer|react developer|angular|vue)\b/i],
  ['backend', /\b(back[- ]?end|api|server|java developer|python developer|golang|node(\.js)? developer|software engineer|sde|swe)\b/i],
]

/** Best-guess role from the position title (+ stack as a tiebreaker). */
export function inferRole(title: string, techStack: string[] = []): RoleKey | null {
  for (const [role, re] of ROLE_PATTERNS) if (re.test(title)) return role
  const stack = techStack.join(' ').toLowerCase()
  if (/spark|airflow|dbt|snowflake|bigquery|etl/.test(stack)) return 'data'
  if (/react|angular|vue|css/.test(stack) && /node|express|django|spring/.test(stack)) return 'fullstack'
  if (/react|angular|vue/.test(stack)) return 'frontend'
  if (/kubernetes|terraform|ansible|aws|gcp/.test(stack)) return 'devops'
  if (/java|python|go|node|spring|django|kafka|postgres/.test(stack)) return 'backend'
  return null
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim()

/** Map free-text skills (JD / must-haves) to skill-map ids via names + aliases. */
export function matchSkills(texts: string[], map: SkillNode[]): Set<string> {
  const out = new Set<string>()
  const hay = texts.map(norm)
  for (const s of map) {
    const keys = [s.id.replace(/-/g, ' '), norm(s.name), ...s.aliases.map(norm)].filter((k) => k.length >= 2)
    if (hay.some((h) => keys.some((k) => h === k || h.includes(k) || (k.length > 3 && k.includes(h) && h.length > 3)))) out.add(s.id)
  }
  return out
}

export interface RankedTask { task: BankTaskLike; score: number; reasons: string[]; coversMustHaves: string[] }

export function rankTasks(tasks: BankTaskLike[], need: PositionNeeds, skillMap: SkillNode[] = [], opts: { includeInactive?: boolean } = {}): RankedTask[] {
  const role = inferRole(need.title, need.techStack)
  const required = matchSkills(need.techStack, skillMap)
  const must = matchSkills(need.mustHaves, skillMap)
  const core = new Set(skillMap.filter((s) => s.priority === 1).map((s) => s.id))
  const expMin = need.experienceMin ?? 0, expMax = need.experienceMax ?? 40
  const stackLangs = need.techStack.map((s) => s.toLowerCase())

  return tasks
    .filter((t) => opts.includeInactive || t.status === 'active')
    .map((t) => {
      const reasons: string[] = []
      let score = 0
      if (role && t.roles.includes(role)) { score += 30; reasons.push(`Built for ${role} roles`) }
      else if (role) { score -= 20; reasons.push(`Not tagged for ${role}`) }
      const covers = t.skills.filter((s) => must.has(s))
      if (covers.length) { score += 25 * covers.length; reasons.push(`Covers must-have: ${covers.join(', ')}`) }
      const overlap = t.skills.filter((s) => required.has(s) && !must.has(s))
      if (overlap.length) { score += 10 * overlap.length; reasons.push(`Tests required skill: ${overlap.join(', ')}`) }
      const coreHit = t.skills.filter((s) => core.has(s) && !must.has(s) && !required.has(s))
      if (coreHit.length) { score += 4 * coreHit.length; reasons.push(`Core skill for the role: ${coreHit.join(', ')}`) }
      const overlapYears = Math.min(expMax, t.experienceMax) - Math.max(expMin, t.experienceMin)
      if (overlapYears >= 0) { score += 12; reasons.push(`Difficulty fits ${expMin}–${expMax} yrs (${t.difficulty})`) }
      else { score -= 15; reasons.push(`Difficulty off for ${expMin}–${expMax} yrs (${t.difficulty}, ${t.experienceMin}–${t.experienceMax})`) }
      const langFit = t.languages.some((l) => stackLangs.some((s) => s.includes(l) || (l === 'cpp' && s.includes('c++'))))
      if (langFit) { score += 5; reasons.push('Language matches the stack') }
      if (!t.rubric || !Array.isArray(t.rubric.probes) || !(t.rubric.probes as unknown[]).length) { score -= 5; reasons.push('No probe answers in the rubric yet') }
      return { task: t, score, reasons, coversMustHaves: covers }
    })
    .sort((a, b) => b.score - a.score)
}

/** Snapshot a bank task (+ rubric) into the Position.workSampleTask shape. */
export function bankTaskToWorkSample(t: BankTaskLike, opts: { preferLanguage?: string | null; approvedBy: string }): WorkSampleTask {
  const langs = t.languages.filter(isWorkspaceLanguage) as WorkspaceLanguage[]
  const language: WorkspaceLanguage = (opts.preferLanguage && isWorkspaceLanguage(opts.preferLanguage) && langs.includes(opts.preferLanguage)) ? opts.preferLanguage : (langs[0] ?? 'python')
  const starter = (t.starterCode && typeof t.starterCode === 'object' ? t.starterCode : {}) as Record<string, unknown>
  const rubric = sanitizeRubric(t.rubric ?? {})
  return {
    title: t.title, prompt: t.prompt, language,
    starterCode: typeof starter[language] === 'string' ? (starter[language] as string) : '',
    minutes: t.minutes,
    tests: Array.isArray(t.tests) ? (t.tests as WorkSampleTask['tests']) : [],
    lookFor: rubric.criteria.map((c) => c.strong).filter(Boolean).slice(0, 6),
    probeAngles: rubric.probes.map((p) => p.decision).slice(0, 6),
    source: 'bank', bankTaskId: t.id, approved: true, approvedBy: opts.approvedBy,
    skills: t.skills, rubric,
  }
}

export { sanitizeSkillMap }
