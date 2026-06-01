import { prisma } from './prisma'

export interface UsageResult {
  allowed:  boolean
  reason?:  'trial_expired' | 'trial_interviews_exhausted' | 'plan_limit_reached' | 'agency_not_found'
  message?: string
  agency?: {
    plan:            string
    interviewsUsed:  number
    interviewsLimit: number
    trialExpiresAt:  Date | null
    trialDaysLeft:   number
  }
}

export async function checkInterviewAllowance(agencyId: string): Promise<UsageResult> {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } })
  if (!agency) {
    return { allowed: false, reason: 'agency_not_found', message: 'Agency not found' }
  }

  const now  = new Date()
  const meta = {
    plan:            agency.plan,
    interviewsUsed:  agency.interviewsUsed,
    interviewsLimit: agency.interviewsLimit,
    trialExpiresAt:  agency.trialExpiresAt,
    trialDaysLeft:   agency.trialExpiresAt
      ? Math.max(0, Math.ceil((agency.trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0,
  }

  if (agency.plan === 'trial') {
    if (agency.trialExpiresAt && now > agency.trialExpiresAt) {
      return {
        allowed: false,
        reason:  'trial_expired',
        message: 'Your 14-day trial has ended. Upgrade to continue.',
        agency:  meta,
      }
    }
    if (agency.interviewsUsed >= agency.trialLimit) {
      return {
        allowed: false,
        reason:  'trial_interviews_exhausted',
        message: `You've used all ${agency.trialLimit} trial interviews. Upgrade to continue.`,
        agency:  meta,
      }
    }
  } else if (agency.plan !== 'enterprise' && agency.interviewsUsed >= agency.interviewsLimit) {
    return {
      allowed: false,
      reason:  'plan_limit_reached',
      message: "You've reached your monthly interview limit. Upgrade your plan.",
      agency:  meta,
    }
  }

  return { allowed: true, agency: meta }
}

/** Increment interview count for an agency.  Call this when an interview completes. */
export async function incrementInterviewUsage(agencyId: string): Promise<void> {
  await prisma.agency.update({
    where: { id: agencyId },
    data:  {
      interviewsUsed: { increment: 1 },
      trialInterviews: { increment: 1 },
    },
  })
}
