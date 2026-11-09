import { canonicalSkill, findSkills, normTerm } from '@/lib/screen/tech-terms'

// ── Resume ↔ role fit (Screen-scoped, isomorphic, deterministic) ───────────
// Fixpack 8 #4. The old "Conf." badge was the resume PARSER's extraction
// confidence — it never looked at the position, so a clean PM resume showed
// "High" for a .NET role. Fit is now scored against the POSITION:
//   1. Required skills = JD-parsed tech stack + skills named in must-haves.
//      Each is: strong (listed in the candidate's skills, or mentioned ≥2× in
//      the resume), mentioned (once, in passing), or missing.
//   2. Role-family alignment: candidate's current title vs the position title
//      (a Product Manager vs an engineering role is a mismatch and caps fit).
//   3. Experience vs the position's range (small weight).
// Every result carries the present / missing lists, so the level is explainable.

export type FitLevel = 'high' | 'medium' | 'low' | 'unknown'
export type SkillStatus = 'strong' | 'mentioned' | 'missing'

export interface FitPosition {
  title: string
  techStack?: string[] | null
  goodToHave?: string[] | null
  mustHaves?: string[] | null
  experienceMin?: number | null
  experienceMax?: number | null
}
export interface FitCandidate {
  currentTitle?: string | null
  topSkills?: string[] | null
  totalYears?: number | null
  resumeText?: string | null
}
export interface RoleFit {
  level: FitLevel
  score: number                                   // 0–100
  skills: { skill: string; status: SkillStatus }[]   // required skills, in order
  present: string[]; missing: string[]
  niceToHave: { present: string[]; missing: string[] }
  role: { candidate: Family | null; position: Family | null; aligned: boolean | null }
  experience: 'below' | 'within' | 'above' | 'unknown'
  reasons: string[]
}

/* ── role families ─────────────────────────────────────────────────────── */
export type Family = 'engineering' | 'qa' | 'data' | 'design' | 'product' | 'management' | 'sales' | 'people' | 'support' | 'finance'
const FAMILY_LABEL: Record<Family, string> = {
  engineering: 'Engineering', qa: 'QA / testing', data: 'Data / analytics', design: 'Design', product: 'Product / project management',
  management: 'General management', sales: 'Sales / marketing', people: 'HR / recruiting', support: 'Support / operations', finance: 'Finance',
}
// Order matters: the first match wins ("engineering manager" is engineering).
const FAMILIES: [Family, RegExp][] = [
  ['engineering', /\b(engineer(ing)? manager|tech(nical)? lead|architect|developer|engineer|programmer|sde|swe|devops|sre|full[- ]?stack|back[- ]?end|front[- ]?end|\.net|java|python|coder|cto)\b/i],
  ['qa', /\b(qa|quality assurance|tester|test (analyst|lead)|sdet|automation test)/i],
  ['data', /\b(data (analyst|scientist)|business analyst|bi analyst|analytics|ml scientist|statistician)\b/i],
  ['design', /\b(designer|ux|ui\/ux|user experience|visual design)\b/i],
  ['product', /\b(product (manager|owner|lead|head)|project manager|program(me)? manager|scrum master|delivery manager|pmo|\bpm\b|apm)\b/i],
  ['sales', /\b(sales|account (executive|manager)|business development|bdm|marketing|growth)\b/i],
  ['people', /\b(hr|human resources|recruiter|talent acquisition|people (partner|ops))\b/i],
  ['support', /\b(support|customer success|operations (executive|associate)|service desk)\b/i],
  ['finance', /\b(accountant|finance|financial analyst|auditor|chartered accountant)\b/i],
  ['management', /\b(manager|director|head of|vp|vice president|general manager|ceo|coo)\b/i],
]
// Families that can credibly do each other's roles (no mismatch penalty).
const ADJACENT: Partial<Record<Family, Family[]>> = {
  engineering: ['qa', 'data'], qa: ['engineering'], data: ['engineering'], product: ['management'], management: ['product'],
}
export function roleFamily(title: string | null | undefined): Family | null {
  if (!title?.trim()) return null
  for (const [f, re] of FAMILIES) if (re.test(title)) return f
  return null
}

/* ── skills ─────────────────────────────────────────────────────────────── */
const uniq = (xs: string[]) => { const s = new Set<string>(); return xs.filter((x) => { const k = x.toLowerCase(); if (!x || s.has(k)) return false; s.add(k); return true }) }

/** Required skills: tech stack entries (canonicalised) + glossary skills named inside must-have sentences. */
export function requiredSkills(p: FitPosition): string[] {
  const stack = (p.techStack ?? []).map((s) => canonicalSkill(s) ?? s.trim()).filter(Boolean)
  const fromMust = (p.mustHaves ?? []).flatMap((m) => Array.from(findSkills(m).keys()))
  return uniq([...stack, ...fromMust])
}

function skillStatus(skill: string, listed: Set<string>, mentions: Map<string, number>, resumeNorm: string): SkillStatus {
  const canon = canonicalSkill(skill)
  const key = (canon ?? skill).toLowerCase()
  if (listed.has(key)) return 'strong'
  let n = canon ? mentions.get(canon) ?? 0 : 0
  if (!canon) {
    // Unknown (non-glossary) skill: literal phrase search in the resume.
    const f = normTerm(skill)
    if (f.length >= 3) n = resumeNorm.split(f).length - 1
  }
  return n >= 2 ? 'strong' : n === 1 ? 'mentioned' : 'missing'
}

/* ── main ───────────────────────────────────────────────────────────────── */
export function scoreRoleFit(p: FitPosition, c: FitCandidate): RoleFit {
  const required = requiredSkills(p)
  const nice = uniq((p.goodToHave ?? []).map((s) => canonicalSkill(s) ?? s.trim()).filter(Boolean)).filter((s) => !required.some((r) => r.toLowerCase() === s.toLowerCase()))
  const listed = new Set((c.topSkills ?? []).map((s) => (canonicalSkill(s) ?? s.trim()).toLowerCase()))
  const resume = c.resumeText ?? ''
  const mentions = findSkills(resume)
  const resumeNorm = ` ${normTerm(resume)} `

  const skills = required.map((skill) => ({ skill, status: skillStatus(skill, listed, mentions, resumeNorm) }))
  const present = skills.filter((s) => s.status !== 'missing').map((s) => s.skill)
  const missing = skills.filter((s) => s.status === 'missing').map((s) => s.skill)
  const coverage = required.length ? skills.reduce((a, s) => a + (s.status === 'strong' ? 1 : s.status === 'mentioned' ? 0.5 : 0), 0) / required.length : 0
  const niceStatus = nice.map((skill) => ({ skill, ok: skillStatus(skill, listed, mentions, resumeNorm) !== 'missing' }))
  const niceCov = nice.length ? niceStatus.filter((n) => n.ok).length / nice.length : 0

  const cf = roleFamily(c.currentTitle), pf = roleFamily(p.title)
  const aligned = cf && pf ? cf === pf || !!ADJACENT[pf]?.includes(cf) : null

  const yrs = typeof c.totalYears === 'number' ? c.totalYears : null
  const min = p.experienceMin ?? null, max = p.experienceMax ?? null
  const experience: RoleFit['experience'] = yrs === null || (min === null && max === null) ? 'unknown'
    : min !== null && yrs < min ? 'below' : max !== null && yrs > max + 3 ? 'above' : 'within'
  const expFactor = experience === 'within' ? 1 : experience === 'unknown' ? 0.5 : experience === 'above' ? 0.7 : Math.max(0, 1 - ((min ?? 0) - (yrs ?? 0)) / 3)

  const reasons: string[] = []
  if (!required.length) {
    reasons.push('This position has no required skills yet — add them to the tech stack or must-haves to score fit.')
    return { level: 'unknown', score: 0, skills, present, missing, niceToHave: { present: [], missing: nice }, role: { candidate: cf, position: pf, aligned }, experience, reasons }
  }

  let score = Math.round(100 * (0.75 * coverage + 0.15 * (nice.length ? niceCov : coverage) + 0.10 * expFactor))
  reasons.push(`${present.length} of ${required.length} required skills found${missing.length ? ` — missing ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` +${missing.length - 5}` : ''}` : ''}.`)
  if (aligned === false && cf && pf) {
    // A different profession is never a strong match, whatever keywords appear.
    score = Math.min(score, coverage >= 0.8 ? 55 : 30)
    reasons.unshift(`Role mismatch: current role "${c.currentTitle}" is ${FAMILY_LABEL[cf]}; this position is ${FAMILY_LABEL[pf]}.`)
  }
  if (experience === 'below') reasons.push(`${yrs} yrs experience — below the ${min}+ yrs the role asks for.`)
  if (experience === 'above') reasons.push(`${yrs} yrs experience — well above the ${min ?? 0}–${max} yrs range.`)

  const level: FitLevel = score >= 70 && coverage >= 0.6 && aligned !== false ? 'high' : score >= 45 ? 'medium' : 'low'
  return {
    level, score, skills, present, missing,
    niceToHave: { present: niceStatus.filter((n) => n.ok).map((n) => n.skill), missing: niceStatus.filter((n) => !n.ok).map((n) => n.skill) },
    role: { candidate: cf, position: pf, aligned }, experience, reasons,
  }
}
