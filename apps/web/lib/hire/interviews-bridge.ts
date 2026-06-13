import { prisma } from '@/lib/prisma'
import { sendEmail, inviteEmailHtml } from '@/lib/emailService'

/**
 * Tenant → Agency resolution. Each HireTenant that uses Interviews gets a
 * linked Agency record in the Interviews product (created lazily).
 */
export async function resolveAgencyId(tenantId: string): Promise<string> {
  const tenant = await prisma.hireTenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error('Tenant not found')
  if (tenant.linkedAgencyId) return tenant.linkedAgencyId

  const agency = await prisma.agency.create({
    data: {
      name: tenant.name,
      onboardingComplete: true,
      plan: 'trial',
      interviewsLimit: 5,
      interviewsUsed: 0,
      trialExpiresAt: tenant.trialEndsAt,
    },
  })
  await prisma.hireTenant.update({ where: { id: tenantId }, data: { linkedAgencyId: agency.id } })
  return agency.id
}

/**
 * Find or create an Interviews Position that mirrors a Hire job. Returns the
 * Interviews Position id. New positions start as 'draft' — they still need a
 * question set + tech-lead/HR approval before interviews can run.
 */
export async function ensureInterviewPosition(hireJobId: string, tenantId: string): Promise<string> {
  const job = await prisma.hireJob.findFirst({ where: { id: hireJobId, tenantId }, include: { client: true } })
  if (!job) throw new Error('Hire job not found')

  const existing = await prisma.hireJobPositionMap.findUnique({ where: { hireJobId } })
  if (existing) return existing.positionId

  const agencyId = await resolveAgencyId(tenantId)
  const position = await prisma.position.create({
    data: {
      title: job.title,
      company: job.client?.name || 'Confidential',
      experienceLevel: 'Mid',
      jdText: job.description,
      jdSource: 'pasted',
      status: 'draft',
      agencyId,
      interviewDuration: 30,
    },
  })
  await prisma.hireJobPositionMap.create({ data: { hireJobId, positionId: position.id } })
  return position.id
}

interface HireCandidateLike { name: string; email: string; phone: string | null; resumeText: string | null }

/**
 * Create an Interviews Candidate mirroring the Hire candidate. A fresh row is
 * created per interview (Interview.candidateId is unique in the Interviews
 * product), so re-triggering yields a clean session.
 */
export async function ensureInterviewsCandidate(candidate: HireCandidateLike, positionId: string): Promise<string> {
  const created = await prisma.candidate.create({
    data: {
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      resumeText: candidate.resumeText,
      positionId,
      status: 'invited',
    },
  })
  return created.id
}

/**
 * Send the Interviews scheduling invite (email). The candidate then proceeds
 * through the existing Interviews schedule → consent → AI interview flow.
 */
export async function triggerInterviewsInvite(interviewId: string): Promise<void> {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { candidate: true, position: { include: { agency: true } } },
  })
  if (!interview) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const schedulingUrl = `${appUrl}/schedule/${interviewId}`
  await prisma.candidate.update({ where: { id: interview.candidateId }, data: { status: 'invited', invitedAt: new Date() } }).catch(() => {})

  if (process.env.RESEND_API_KEY && interview.candidate.email) {
    const agency = interview.position.agency
    await sendEmail({
      to: interview.candidate.email,
      from: agency?.senderEmail && agency.resendDomainVerified ? `${agency.senderName ?? agency.name} <${agency.senderEmail}>` : undefined,
      subject: `Interview Invitation — ${interview.position.title} at ${interview.position.company}`,
      html: inviteEmailHtml({
        candidateName: interview.candidate.name,
        positionTitle: interview.position.title,
        company: interview.position.company,
        agencyName: agency?.name ?? 'The hiring team',
        schedulingUrl,
        duration: interview.position.interviewDuration ?? 30,
      }),
    }).catch((e) => console.error('[interviews-bridge] invite email failed:', e))
  } else {
    console.log('[interviews-bridge] (no RESEND key) scheduling URL:', schedulingUrl)
  }
}
