import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getDemoPersona, DEMO_PERSONAS } from '@/lib/screen/demo/personas'
import { demoWorkSample } from '@/lib/screen/demo/work-sample'
import { deleteDemoSession } from '@/lib/screen/demo/cleanup'
import { DEFAULT_VOICE_KEY, VOICE_OPTIONS } from '@/lib/voiceOptions'
import { PRODUCTION_INTERVIEW_MINUTES } from '@/lib/screen/session/duration'
import { sanitizeFacts, type CandidateFacts } from '@/lib/screen/session/facts'

// ── Interview Test Sandbox (Screen-scoped, server-only, admin-only) ─────────
// Spins up a throwaway interview that runs the REAL room / engine / prompts /
// voice pipeline. Isolation, belt and braces:
//   • every row lives under the internal SANDBOX agency (no users, webhooks,
//     ATS or Hire links), so no customer view, email or webhook can see it
//   • Position / Candidate / Interview are isDemo=true → excluded by every
//     analytics / report / review-queue / control-room / export query
//   • Interview.isSandbox=true → production room flow, no usage billing,
//     report readable by platform admins only, own TTL (not the demo sweep)

export const SANDBOX_AGENCY_NAME = 'Levl1 Interview Sandbox (internal)'
/** INTERVIEW_SANDBOX_ENABLED=0 switches the sandbox off entirely. */
export const sandboxEnabled = () => (process.env.INTERVIEW_SANDBOX_ENABLED ?? '1').trim() !== '0'
const ttlHours = () => { const n = Number(process.env.INTERVIEW_SANDBOX_TTL_HOURS); return Number.isFinite(n) && n >= 1 && n <= 24 * 14 ? n : 24 }
/** Short run: ~3 questions, no work sample — for fast iteration. */
export const SANDBOX_SHORT_MINUTES = 15

export async function sandboxAgencyId(): Promise<string> {
  const existing = await prisma.agency.findFirst({ where: { name: SANDBOX_AGENCY_NAME }, select: { id: true } })
  if (existing) return existing.id
  // Enterprise-style limits so nothing in the engine is ever gated by "trial".
  return (await prisma.agency.create({ data: { name: SANDBOX_AGENCY_NAME, plan: 'enterprise', interviewsLimit: 1_000_000, trialLimit: 1_000_000 } })).id
}

export interface SandboxInput {
  source: { type: 'persona'; slug: string } | { type: 'position'; id: string }
  name?: string
  location?: string
  yearsExperience?: number | null
  noticePeriod?: string
  length: 'short' | 'full'
  voice?: string
}

const str = (v: unknown, n = 80) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

export function parseSandboxInput(raw: unknown): SandboxInput | { error: string } {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const src = (o.source && typeof o.source === 'object' ? o.source : {}) as Record<string, unknown>
  const source = src.type === 'position' && typeof src.id === 'string' && src.id
    ? { type: 'position' as const, id: src.id }
    : { type: 'persona' as const, slug: str(src.slug, 60) || 'backend-engineer' }
  if (source.type === 'persona' && !getDemoPersona(source.slug)) return { error: 'Unknown preset role' }
  const years = o.yearsExperience === '' || o.yearsExperience == null ? null : Number(o.yearsExperience)
  const voice = str(o.voice, 40)
  return {
    source,
    name: str(o.name) || 'Test Candidate',
    location: str(o.location),
    yearsExperience: years != null && Number.isFinite(years) && years >= 0 && years <= 60 ? years : null,
    noticePeriod: str(o.noticePeriod, 60),
    length: o.length === 'full' ? 'full' : 'short',
    voice: VOICE_OPTIONS.some((v) => v.key === voice) ? voice : DEFAULT_VOICE_KEY,
  }
}

const shortQs = (arr: unknown, n: number) => (Array.isArray(arr) ? arr.slice(0, n) : []) as Prisma.InputJsonValue

/** Create a sandbox run; returns the interview id the admin opens in the real room. */
export async function createSandboxRun(input: SandboxInput, actor: string) {
  await sweepSandbox().catch(() => {})
  const agencyId = await sandboxAgencyId()
  const short = input.length === 'short'
  const minutes = short ? SANDBOX_SHORT_MINUTES : PRODUCTION_INTERVIEW_MINUTES
  let label = ''
  let positionData: Prisma.PositionUncheckedCreateInput
  let qs: { technical: unknown; scenario: unknown; behavioral: unknown; eq: unknown; whiteboard: unknown; time: unknown }

  if (input.source.type === 'persona') {
    const p = getDemoPersona(input.source.slug)!
    const ws = short ? null : demoWorkSample(p)
    label = `${p.title} (preset)`
    positionData = {
      agencyId, isDemo: true, title: p.title, company: 'Levl1 Sandbox', experienceLevel: 'mid', roleType: 'IC',
      techStack: p.skills, status: 'active', jdText: p.jdText, jdSource: 'generated',
      techLeadApproved: true, hrApproved: true, rubricApproved: true,
      ...(ws ? { interviewMode: 'technical', workSampleTask: ws as unknown as Prisma.InputJsonValue } : {}),
      interviewDuration: minutes, voiceAccent: input.voice,
    }
    qs = { technical: p.questions.technical, scenario: p.questions.scenario, behavioral: p.questions.behavioral, eq: p.questions.eq, whiteboard: p.questions.whiteboard, time: { totalMinutes: minutes } }
  } else {
    // Clone a real role's configuration (JD, questions, rubric, logistics, knockouts…)
    // into the sandbox agency. The source position is only READ.
    const src = await prisma.position.findUnique({ where: { id: input.source.id }, include: { questionSet: true } })
    if (!src || src.isDemo) throw new Error('Role not found')
    if (!src.questionSet) throw new Error('That role has no approved question set yet')
    const { id: _id, agencyId: _a, clientId: _c, createdAt: _cr, updatedAt: _u, questionSet, techLeadEmail: _t, hrEmail: _h, clientManagerEmail: _m, ...rest } = src
    void _id; void _a; void _c; void _cr; void _u; void _t; void _h; void _m
    label = `${src.title} · ${src.company} (copy)`
    positionData = {
      ...(rest as unknown as Prisma.PositionUncheckedCreateInput),
      agencyId, isDemo: true, status: 'active', techLeadApproved: true, hrApproved: true, rubricApproved: true,
      interviewDuration: minutes, voiceAccent: input.voice,
      ...(short ? { interviewMode: null, workSampleTask: undefined } : {}),
    } as Prisma.PositionUncheckedCreateInput
    // Json columns: Prisma wants InputJsonValue, never a raw null.
    for (const k of Object.keys(positionData) as (keyof typeof positionData)[]) if (positionData[k] === null && k !== 'interviewMode') delete positionData[k]
    qs = { technical: questionSet.technicalQuestions, scenario: questionSet.scenarioQuestions, behavioral: questionSet.behavioralQuestions, eq: questionSet.eqQuestions, whiteboard: questionSet.whiteboardQuestions, time: { totalMinutes: minutes } }
  }

  const position = await prisma.position.create({ data: positionData })
  await prisma.questionSet.create({
    data: {
      positionId: position.id,
      technicalQuestions: short ? shortQs(qs.technical, 1) : qs.technical as Prisma.InputJsonValue,
      scenarioQuestions: short ? shortQs(qs.scenario, 1) : qs.scenario as Prisma.InputJsonValue,
      behavioralQuestions: short ? shortQs(qs.behavioral, 1) : qs.behavioral as Prisma.InputJsonValue,
      eqQuestions: short ? shortQs(qs.eq, 0) : qs.eq as Prisma.InputJsonValue,
      whiteboardQuestions: short ? shortQs(qs.whiteboard, 0) : qs.whiteboard as Prisma.InputJsonValue,
      timeAllocation: qs.time as Prisma.InputJsonValue,
    },
  })

  const facts: CandidateFacts = sanitizeFacts({ location: input.location, yearsExperience: input.yearsExperience, noticePeriod: input.noticePeriod })
  const stamp = Date.now().toString(36)
  const candidate = await prisma.candidate.create({
    data: {
      name: input.name || 'Test Candidate', email: `sandbox+${stamp}@sandbox.levl1.invalid`, positionId: position.id, isDemo: true,
      totalYears: facts.yearsExperience != null ? Math.round(facts.yearsExperience) : null, topSkills: position.techStack, status: 'scheduled',
    },
  })
  const interview = await prisma.interview.create({
    data: {
      candidateId: candidate.id, positionId: position.id, isDemo: true, isSandbox: true, status: 'scheduled', duration: minutes, scheduledAt: new Date(),
      sandboxConfig: { label, facts, length: input.length, voice: input.voice, source: input.source, createdBy: actor } as unknown as Prisma.InputJsonValue,
    },
  })
  console.info(JSON.stringify({ evt: 'sandbox_run_created', interviewId: interview.id, source: input.source, length: input.length }))
  return { interviewId: interview.id, label }
}

/** Sandbox runs are throwaway: delete those older than the TTL (default 24h). */
export async function sweepSandbox() {
  const cutoff = new Date(Date.now() - ttlHours() * 3600_000)
  const stale = await prisma.interview.findMany({ where: { isSandbox: true, createdAt: { lt: cutoff } }, select: { id: true, candidateId: true, positionId: true }, take: 50 })
  for (const iv of stale) await deleteSandboxRun(iv)
  return stale.length
}

export async function deleteSandboxRun(iv: { id: string; candidateId: string; positionId: string }) {
  await deleteDemoSession(iv.candidateId, iv.positionId, iv.id)
}

export const SANDBOX_PRESETS = DEMO_PERSONAS.map((p) => ({ slug: p.slug, title: p.title }))

/** Internal agencies (demo gallery + sandbox) — never counted as customers. */
export const INTERNAL_AGENCY_NAMES = ['__Levl1 Demo__', SANDBOX_AGENCY_NAME]
