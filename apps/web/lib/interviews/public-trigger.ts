import { prisma } from '@/lib/prisma'
import { sendEmail, inviteEmailHtml } from '@/lib/emailService'
import { autoApproveQuestionSet } from '@/lib/interviews/questions'

// ── Interviews-owned public interview trigger (Phase 1) ────────────────────
// ATS-agnostic: works entirely on Interviews models (Agency / Position /
// Candidate / Interview). Imports NOTHING from lib/hire/*.

const INTAKE_TITLE = '__api_intake__'

// A per-agency holding Position for API-created candidates (before an interview
// is triggered). Candidate requires a positionId in the Interviews schema.
export async function ensureIntakePosition(agencyId: string): Promise<string> {
  const existing = await prisma.position.findFirst({ where: { agencyId, title: INTAKE_TITLE }, select: { id: true } })
  if (existing) return existing.id
  const created = await prisma.position.create({
    data: { title: INTAKE_TITLE, company: 'API Intake', experienceLevel: 'Mid', status: 'draft', agencyId, interviewDuration: 30 },
  })
  return created.id
}

export interface ApiCandidateInput { name: string; email: string; phone?: string | null; resumeText?: string | null }

export async function createApiCandidate(agencyId: string, input: ApiCandidateInput): Promise<{ id: string }> {
  const positionId = await ensureIntakePosition(agencyId)
  const c = await prisma.candidate.create({
    data: { name: input.name, email: input.email.toLowerCase(), phone: input.phone ?? null, resumeText: input.resumeText ?? null, positionId, status: 'pending' },
    select: { id: true },
  })
  return { id: c.id }
}

export interface TriggerInput {
  agencyId: string
  candidateId: string
  inline?: { title: string; jdText: string } | null
  positionId?: string | null
}

export async function triggerInterview(input: TriggerInput): Promise<{ interviewId: string; interviewUrl: string }> {
  const { agencyId, candidateId } = input

  // Source candidate must belong to this agency (via its Position).
  const source = await prisma.candidate.findUnique({ where: { id: candidateId }, include: { position: { select: { agencyId: true } } } })
  if (!source || source.position.agencyId !== agencyId) throw new Error('Candidate not found')
  if (!source.email) throw new Error('Candidate email is required')

  // Resolve the target Position.
  let positionId: string
  let title: string
  let jd: string
  if (input.positionId) {
    const pos = await prisma.position.findUnique({ where: { id: input.positionId } })
    if (!pos || pos.agencyId !== agencyId) throw new Error('Position not found')
    positionId = pos.id; title = pos.title; jd = pos.jdText ?? pos.title
  } else if (input.inline) {
    const pos = await prisma.position.create({
      data: { title: input.inline.title, company: 'Confidential', experienceLevel: 'Mid', jdText: input.inline.jdText, jdSource: 'pasted', status: 'draft', agencyId, interviewDuration: 30 },
    })
    positionId = pos.id; title = input.inline.title; jd = input.inline.jdText
  } else {
    throw new Error('Provide either positionId or inline { title, jdText }')
  }

  // Ensure an approved question set (auto-approve for API — no human in loop).
  await autoApproveQuestionSet(positionId, title, jd)

  // Mirror a fresh Candidate under the target Position (Interview.candidateId is
  // unique, so each interview gets its own candidate row — same as before).
  const interviewee = await prisma.candidate.create({
    data: { name: source.name, email: source.email, phone: source.phone, resumeText: source.resumeText, positionId, status: 'invited', invitedAt: new Date() },
    select: { id: true },
  })
  const interview = await prisma.interview.create({
    data: { candidateId: interviewee.id, positionId, status: 'scheduled', duration: 30 },
    select: { id: true },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const schedulingUrl = `${appUrl}/schedule/${interview.id}`

  // Send the scheduling invite (non-fatal).
  try {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } })
    const position = await prisma.position.findUnique({ where: { id: positionId } })
    if (process.env.RESEND_API_KEY && source.email && agency && position) {
      await sendEmail({
        to: source.email,
        from: agency.senderEmail && agency.resendDomainVerified ? `${agency.senderName ?? agency.name} <${agency.senderEmail}>` : undefined,
        subject: `Interview Invitation — ${position.title} at ${position.company}`,
        html: inviteEmailHtml({ candidateName: source.name, positionTitle: position.title, company: position.company, agencyName: agency.name, schedulingUrl, duration: position.interviewDuration ?? 30 }),
      })
    } else {
      console.log('[interviews/public-trigger] (no RESEND key) scheduling URL:', schedulingUrl)
    }
  } catch (e) {
    console.error('[interviews/public-trigger] invite email failed (non-fatal):', e)
  }

  return { interviewId: interview.id, interviewUrl: schedulingUrl }
}
