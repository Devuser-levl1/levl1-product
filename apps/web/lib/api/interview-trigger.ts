import { prisma } from '@/lib/prisma'
import {
  resolveAgencyId, ensureInterviewPosition, ensureInterviewsCandidate,
  autoApproveForApiInterview, triggerInterviewsInvite,
} from '@/lib/hire/interviews-bridge'

export interface TriggerInput {
  tenantId: string
  hireCandidateId: string
  jobId?: string | null
  inline?: { title: string; jdText: string } | null
}

export interface TriggerResult {
  interviewId: string
  interviewUrl: string
  positionId: string
}

/**
 * Trigger an AI interview for a Hire candidate via the public API. Accepts
 * either an existing Hire jobId OR an inline { title, jdText } so ATS-agnostic
 * callers need no Hire job. Reuses the existing Interviews engine end-to-end;
 * the question set is auto-generated + approved (no human approval UI).
 */
export async function triggerPublicInterview(input: TriggerInput): Promise<TriggerResult> {
  const { tenantId, hireCandidateId } = input

  const candidate = await prisma.hireCandidate.findFirst({ where: { id: hireCandidateId, tenantId } })
  if (!candidate) throw new Error('Candidate not found')
  if (!candidate.email) throw new Error('Candidate email is required to run an interview')

  // 1. Resolve the Interviews Position.
  let positionId: string
  let title: string
  let jdText: string

  if (input.jobId) {
    const job = await prisma.hireJob.findFirst({ where: { id: input.jobId, tenantId } })
    if (!job) throw new Error('Job not found')
    positionId = await ensureInterviewPosition(job.id, tenantId)
    title = job.title
    jdText = job.description
  } else if (input.inline) {
    const agencyId = await resolveAgencyId(tenantId)
    const position = await prisma.position.create({
      data: {
        title: input.inline.title,
        company: 'Confidential',
        experienceLevel: 'Mid',
        jdText: input.inline.jdText,
        jdSource: 'pasted',
        status: 'active',
        agencyId,
        interviewDuration: 30,
      },
    })
    positionId = position.id
    title = input.inline.title
    jdText = input.inline.jdText
  } else {
    throw new Error('Provide either jobId or inline { title, jdText }')
  }

  // 2. Ensure an approved question set so the interview can actually run.
  await autoApproveForApiInterview(positionId, title, jdText)

  // 3. Mirror the candidate into the Interviews product and create the session.
  const interviewsCandidateId = await ensureInterviewsCandidate(
    { name: candidate.name, email: candidate.email, phone: candidate.phone, resumeText: candidate.resumeText },
    positionId,
  )
  const interview = await prisma.interview.create({
    data: { candidateId: interviewsCandidateId, positionId, status: 'scheduled', duration: 30 },
  })

  // 4. Link back to Hire so results sync + webhooks resolve the tenant.
  await prisma.hireInterviewLink.create({
    data: { hireCandidateId: candidate.id, interviewSessionId: interview.id, positionId, status: 'scheduled' },
  })

  // 5. Send the candidate the scheduling/interview invite (non-fatal).
  await triggerInterviewsInvite(interview.id).catch((e) => console.error('[interview-trigger] invite failed:', e))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  return { interviewId: interview.id, interviewUrl: `${appUrl}/schedule/${interview.id}`, positionId }
}
