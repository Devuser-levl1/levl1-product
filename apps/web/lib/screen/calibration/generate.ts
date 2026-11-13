import Anthropic from '@anthropic-ai/sdk'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { execute, judge0Configured } from '@/lib/screen/workspace/judge0'
import { executionPlan, isWorkspaceLanguage, outputsMatch, type WorkspaceLanguage } from '@/lib/screen/workspace/task'
import { sanitizeRubricInput, isRubricTier, type RubricContent, type RubricTier } from '@/lib/screen/rubrics/types'
import { sanitizeRubric, sanitizeTaskInput, type Rubric, type TaskInput } from '@/lib/screen/taskbank/types'

// ── AI drafting of rubrics + tasks from a position (Screen-scoped, server-only) ─
// OFFLINE generation, so it uses the deep tier (SCORING_MODEL, Opus) for
// quality. Output is strict JSON inside <result> tags. Every item carries the
// model's REASONING and a self-assessed CONFIDENCE + what it was unsure of —
// shown to the moderator so calibration is a real review, not a rubber stamp.
// Tasks: the reference solution is EXECUTED in Judge0 against every test and
// the expected outputs are replaced with the real ones (failing tests dropped).

export interface PositionContext {
  title: string
  company: string | null
  jdText: string | null
  techStack: string[]
  mustHaves: string[]
  goodToHave: string[]
  experienceMin: number | null
  experienceMax: number | null
  primaryDomain: string | null
  /** Active library rubrics the AI may REUSE instead of duplicating. */
  existing: { id: string; area: string; subSkill: string; keywords: string[] }[]
}

export interface RubricDraft extends RubricContent {
  existingRubricId: string | null
  tier: RubricTier
  tierReason: string
  reasoning: string
  confidence: number
  uncertainty: string
}

export interface TaskDraft {
  task: TaskInput
  rubric: Rubric
  reasoning: string
  confidence: number
  uncertainty: string
  verified: boolean
  droppedTests: number
  verifyNote: string
}

const SHARED_RULES =
  'You draft interview content that a human MODERATOR will calibrate before it is ever used. Be useful to that reviewer:\n' +
  '- Ground everything in THIS position. Prefer what the JD states over what is typical for the title.\n' +
  '- Be technically precise and current. Never cite deprecated APIs or practices as "good". If unsure about a detail, say so in "uncertainty" rather than guessing confidently.\n' +
  '- "confidence" (0–1) is your honest self-assessment for that item: lower it when the JD is vague, the skill is inferred, or the domain is niche.\n' +
  '- "reasoning" explains, in 1–3 sentences, WHY this item belongs in this interview (cite the JD where possible).\n' +
  '- Plain text only (no markdown, no emoji). Return ONLY the JSON object, wrapped in <result></result> tags.'

function ctxBlock(p: PositionContext): string {
  const exp = p.experienceMin != null || p.experienceMax != null ? `${p.experienceMin ?? 0}–${p.experienceMax ?? '?'} years` : 'unspecified'
  return (
    `POSITION: ${p.title}${p.company ? ` at ${p.company}` : ''}\n` +
    `EXPERIENCE: ${exp}\n` +
    `DOMAIN: ${p.primaryDomain || 'unspecified'}\n` +
    `REQUIRED SKILLS (JD parse): ${p.techStack.join(', ') || 'none listed'}\n` +
    `MUST-HAVES (recruiter): ${p.mustHaves.join(' | ') || 'none listed'}\n` +
    `NICE-TO-HAVES: ${p.goodToHave.join(', ') || 'none listed'}\n` +
    `JOB DESCRIPTION:\n${(p.jdText ?? '').slice(0, 6000) || '(no JD text — rely on the fields above and lower your confidence)'}\n`
  )
}

async function callJson(system: string, user: string, maxTokens: number): Promise<Record<string, unknown>> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  const client = new Anthropic({ apiKey: key })
  // Opus 4.8: no temperature/top_p/top_k.
  const res = await client.messages.create({ model: SCORING_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] })
  if (res.stop_reason === 'max_tokens') throw new Error('The draft was cut off (max tokens) — try regenerating.')
  if (res.stop_reason === 'refusal') throw new Error('The model declined to generate this content.')
  const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
  const tagged = text.match(/<result>([\s\S]*?)<\/result>/)
  const body = (tagged ? tagged[1] : text).trim()
  const start = body.indexOf('{'); const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The model returned no JSON.')
  return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>
}

const num01 = (v: unknown, d = 0.5) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d }
const s = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

function toRubricDraft(raw: unknown, p: PositionContext): RubricDraft | null {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const reuseId = typeof o.existingRubricId === 'string' && p.existing.some((e) => e.id === o.existingRubricId) ? o.existingRubricId : null
  const reused = reuseId ? p.existing.find((e) => e.id === reuseId)! : null
  const v = sanitizeRubricInput(reused ? { ...o, area: reused.area, subSkill: reused.subSkill, proficientIn: o.proficientIn || 'see library rubric', ableTo: o.ableTo || 'see library rubric', practices: o.practices || 'see library rubric' } : o)
  if (!v.ok) return null
  return {
    ...v.rubric,
    existingRubricId: reuseId,
    tier: isRubricTier(o.tier) ? o.tier : 'good',
    tierReason: s(o.tierReason, 500),
    reasoning: s(o.reasoning, 1200),
    confidence: num01(o.confidence),
    uncertainty: s(o.uncertainty, 600),
  }
}

const RUBRIC_SHAPE =
  `{\n` +
  `  "existingRubricId": "<id from EXISTING ACTIVE RUBRICS if one already covers this competency, else null>",\n` +
  `  "area": "role or technology group, e.g. .NET Full Stack",\n` +
  `  "subSkill": "the competency, e.g. ASP.NET Core Web APIs",\n` +
  `  "proficientIn": "X — the specific areas and tools",\n` +
  `  "ableTo": "Y — what they can design / build / troubleshoot",\n` +
  `  "practices": "Z — the practices a strong practitioner follows",\n` +
  `  "strong": "what a strong answer shows (concrete, checkable)",\n` +
  `  "weak": "what a weak answer looks like",\n` +
  `  "keywords": ["terms used in JDs and answers for this competency"],\n` +
  `  "probes": [{ "question": "a question the interviewer can ask", "strongAnswer": "what a strong answer covers", "weakSignals": "red flags" }],\n` +
  `  "tier": "must | good | addon",\n` +
  `  "tierReason": "why this tier (cite the JD)",\n` +
  `  "reasoning": "why this competency belongs in this interview",\n` +
  `  "confidence": 0.0,\n` +
  `  "uncertainty": "what you were unsure about, or empty"\n` +
  `}`

const TIER_RULES =
  'TIERS — Must-have gates the hiring verdict, so be conservative:\n' +
  '- "must": ONLY competencies the JD states as required or the recruiter listed as must-haves. Typically 2–4.\n' +
  '- "good": clearly valuable for the role but not stated as required (nice-to-haves, strongly implied skills).\n' +
  '- "addon": adjacent or bonus competencies worth noting if time allows.\n'

export async function generateRubricDrafts(p: PositionContext): Promise<{ drafts: RubricDraft[]; jdThin: boolean; jdNote: string }> {
  const existing = p.existing.length
    ? `EXISTING ACTIVE RUBRICS (already human-reviewed — REUSE one via existingRubricId instead of drafting a duplicate):\n${p.existing.slice(0, 40).map((e) => `- ${e.id}: ${e.area} → ${e.subSkill} [${e.keywords.slice(0, 6).join(', ')}]`).join('\n')}\n`
    : ''
  const out = await callJson(
    SHARED_RULES + '\n\n' + TIER_RULES +
    'Draft 5–8 RUBRICS: the distinct competencies this interview should assess. Each is one proficiency standard ' +
    '("The candidate should be proficient in X, and able to Y, by following Z"), with strong/weak anchors and 1–3 probe questions with expected answers.',
    `${ctxBlock(p)}\n${existing}\nReturn:\n<result>{\n  "jdAssessment": { "thin": true|false, "note": "is the JD specific enough to draft from? what is missing?" },\n  "rubrics": [ ${RUBRIC_SHAPE} ]\n}</result>`,
    12000,
  )
  const ja = (out.jdAssessment && typeof out.jdAssessment === 'object' ? out.jdAssessment : {}) as Record<string, unknown>
  const drafts = (Array.isArray(out.rubrics) ? out.rubrics : []).map((r) => toRubricDraft(r, p)).filter((r): r is RubricDraft => !!r).slice(0, 10)
  if (!drafts.length) throw new Error('No usable rubrics were drafted.')
  return { drafts, jdThin: ja.thin === true, jdNote: s(ja.note, 500) }
}

/** One rubric — for "regenerate this item" and "add with AI". */
export async function generateOneRubric(p: PositionContext, opts: { competency: string; instruction?: string; previous?: RubricContent | null }): Promise<RubricDraft> {
  const prev = opts.previous
    ? `THE PREVIOUS DRAFT (the moderator wants a better one):\n${JSON.stringify({ subSkill: opts.previous.subSkill, proficientIn: opts.previous.proficientIn, ableTo: opts.previous.ableTo, practices: opts.previous.practices, strong: opts.previous.strong, weak: opts.previous.weak })}\n`
    : ''
  const out = await callJson(
    SHARED_RULES + '\n\n' + TIER_RULES + 'Draft exactly ONE rubric for the competency named below.',
    `${ctxBlock(p)}\nCOMPETENCY: ${opts.competency}\n${opts.instruction ? `MODERATOR INSTRUCTION: ${opts.instruction}\n` : ''}${prev}\nReturn:\n<result>{ "rubric": ${RUBRIC_SHAPE} }</result>`,
    4000,
  )
  const d = toRubricDraft(out.rubric, { ...p, existing: [] })
  if (!d) throw new Error('The regenerated rubric was incomplete — try again.')
  return { ...d, existingRubricId: null }
}

function pickLanguage(stack: string[]): WorkspaceLanguage {
  const t = stack.join(' ').toLowerCase()
  if (/typescript|angular|nest/.test(t)) return 'typescript'
  if (/react|node|javascript|vue/.test(t)) return 'javascript'
  if (/\bgo\b|golang/.test(t)) return 'go'
  if (/java\b|spring|kotlin/.test(t)) return 'java'
  if (/c\+\+|cpp/.test(t)) return 'cpp'
  return 'python'
}

function roleKeyFor(title: string, stack: string[]): string {
  const t = `${title} ${stack.join(' ')}`.toLowerCase()
  if (/full[- ]?stack/.test(t)) return 'fullstack'
  if (/front[- ]?end|react|angular|vue/.test(t)) return 'frontend'
  if (/data engineer|spark|airflow|etl|dbt/.test(t)) return 'data'
  if (/devops|sre|platform|kubernetes|terraform/.test(t)) return 'devops'
  if (/android|ios|mobile|flutter/.test(t)) return 'mobile'
  if (/\bml\b|machine learning|data scientist/.test(t)) return 'ml'
  return 'backend'
}

/** One work-sample task with its own rubric, verified in Judge0. */
export async function generateTaskDraft(p: PositionContext, opts: { instruction?: string; previousTitle?: string } = {}): Promise<TaskDraft> {
  const language = pickLanguage(p.techStack)
  const difficulty = (p.experienceMin ?? 3) >= 7 ? 'senior' : (p.experienceMin ?? 3) <= 1 ? 'junior' : 'mid'
  const out = await callJson(
    SHARED_RULES + '\n\n' +
    'Draft ONE practical WORK-SAMPLE task. The candidate solves it in a browser IDE against stdin→stdout tests, then DEFENDS their decisions verbally.\n' +
    '- A real slice of THIS role\'s work (parsing, aggregation, a small scheduler, rate limiting, data cleanup, an API-shaped transformation) — never a puzzle.\n' +
    '- Solvable in ~10–15 minutes at the stated level; standard library only; no network, no files. Program reads ALL input from stdin, prints to stdout; state exact formats with one worked example.\n' +
    '- At least one genuine design decision worth defending (data structure, edge-case policy, complexity trade-off).\n' +
    '- 6–8 tests: 2 visible (simple), the rest hidden edge cases (empty input, duplicates, large-ish input, malformed lines if relevant).\n' +
    '- The rubric scores the code (criteria) and the defense (probes with the EXPECTED strong answer and weak signals).',
    `${ctxBlock({ ...p, existing: [] })}\nCANDIDATE LANGUAGE: ${language}\nDIFFICULTY: ${difficulty}\n` +
    (opts.instruction ? `MODERATOR INSTRUCTION: ${opts.instruction}\n` : '') +
    (opts.previousTitle ? `Do NOT repeat the previous task "${opts.previousTitle}" — draft a different, better one.\n` : '') +
    `\nReturn:\n<result>{\n  "title": "short task name",\n  "prompt": "what to build, input format, output format, one worked example",\n` +
    `  "starterCode": "minimal ${language} skeleton that reads stdin (no solution logic)${language === 'java' ? '; class Main' : ''}",\n` +
    `  "minutes": 12,\n  "skills": ["skill ids, e.g. api-design, data-structures"],\n` +
    `  "tests": [{ "name": "...", "input": "exact stdin", "expected": "exact stdout", "hidden": false }],\n` +
    `  "referenceSolution": "a correct, complete PYTHON 3 solution reading stdin",\n` +
    `  "criteria": [{ "dimension": "correctness|efficiency|edge_cases|code_quality|structure", "strong": "...", "weak": "...", "weight": 1 }],\n` +
    `  "probes": [{ "decision": "a decision point in their solution", "question": "what to ask", "strongAnswer": "expected strong answer", "weakSignals": "red flags" }],\n` +
    `  "reasoning": "why this task fits this role and level",\n  "confidence": 0.0,\n  "uncertainty": "what you were unsure about, or empty"\n}</result>`,
    9000,
  )
  const v = sanitizeTaskInput({
    title: out.title, prompt: out.prompt, roles: [roleKeyFor(p.title, p.techStack)], skills: out.skills, difficulty,
    experienceMin: p.experienceMin ?? undefined, experienceMax: p.experienceMax ?? undefined,
    languages: [language], starterCode: { [language]: out.starterCode }, tests: out.tests,
    referenceSolution: out.referenceSolution, referenceLanguage: 'python', minutes: out.minutes,
  })
  if (!v.ok) throw new Error(`The drafted task was incomplete: ${v.error}`)
  const rubric = sanitizeRubric({ criteria: out.criteria, probes: out.probes })
  const task = v.task

  // Verify: run the reference against every test; replace expected with real output.
  let verified = false, dropped = 0, verifyNote = ''
  if (!task.referenceSolution.trim()) verifyNote = 'No reference solution was produced.'
  else if (!judge0Configured()) verifyNote = 'Judge0 is not configured — tests are unverified.'
  else {
    const kept: typeof task.tests = []
    for (const t of task.tests) {
      const r = await execute({ language: 'python', ...executionPlan('python', task.referenceSolution, t.input) })
      if (r.status === 'ok' && r.stdout.trim()) kept.push({ ...t, expected: outputsMatch(r.stdout, t.expected) ? t.expected : r.stdout.replace(/\s+$/, '') })
      else dropped++
    }
    verified = kept.length >= 2 && kept.some((t) => !t.hidden)
    task.tests = kept
    verifyNote = verified ? `${kept.length} tests verified by running the reference solution in Judge0` : 'The reference solution failed — tests are unverified.'
  }
  if (!isWorkspaceLanguage(language)) throw new Error('Unsupported language')
  return { task, rubric, reasoning: s(out.reasoning, 1200), confidence: num01(out.confidence), uncertainty: s(out.uncertainty, 600), verified, droppedTests: dropped, verifyNote }
}
