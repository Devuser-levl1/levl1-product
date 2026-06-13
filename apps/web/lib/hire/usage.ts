import { prisma } from '@/lib/prisma'
import { HIRE_PLANS, TRIAL_LIMITS, PlanLimits } from './plans'

interface TenantLike {
  id: string
  plan: string
  trialActive: boolean
  trialEndsAt: Date | null
  subscriptionStatus: string | null
  usageCandidatesThisMonth: number
  usageInterviewsThisMonth: number
  usageResetAt: Date | null
  currentPeriodEnd: Date | null
}

export function getLimits(tenant: TenantLike): PlanLimits {
  if (tenant.trialActive) return TRIAL_LIMITS
  const plan = HIRE_PLANS[tenant.plan as HirePlanIdLoose]
  return plan ? plan.limits : TRIAL_LIMITS
}
type HirePlanIdLoose = keyof typeof HIRE_PLANS

function monthsApart(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

export async function ensureUsageWindow(tenant: TenantLike): Promise<TenantLike> {
  const now = new Date()
  if (!tenant.usageResetAt || monthsApart(tenant.usageResetAt, now) >= 1) {
    await prisma.hireTenant.update({ where: { id: tenant.id }, data: { usageCandidatesThisMonth: 0, usageInterviewsThisMonth: 0, usageResetAt: now } })
    return { ...tenant, usageCandidatesThisMonth: 0, usageInterviewsThisMonth: 0, usageResetAt: now }
  }
  return tenant
}

export interface Allowance { allowed: boolean; reason?: string; message?: string }

export async function checkAllowance(tenantId: string, kind: 'candidate' | 'interview' | 'job' | 'seat'): Promise<Allowance> {
  const raw = await prisma.hireTenant.findUnique({ where: { id: tenantId } })
  if (!raw) return { allowed: false, reason: 'no_tenant', message: 'Tenant not found' }
  const tenant = await ensureUsageWindow(raw as TenantLike)
  const limits = getLimits(tenant)

  if (tenant.trialActive && tenant.trialEndsAt && new Date() > tenant.trialEndsAt) {
    await prisma.hireTenant.update({ where: { id: tenantId }, data: { trialActive: false } })
    return { allowed: false, reason: 'trial_expired', message: 'Your 14-day trial has ended. Upgrade to continue.' }
  }
  if (!tenant.trialActive) {
    const graceOk = tenant.subscriptionStatus === 'past_due' && tenant.currentPeriodEnd && Date.now() < tenant.currentPeriodEnd.getTime() + 3 * 86400000
    if (tenant.subscriptionStatus !== 'active' && !graceOk) {
      return { allowed: false, reason: 'no_subscription', message: 'Choose a plan to continue using Levl1 Hire.' }
    }
  }

  if (kind === 'candidate' && tenant.usageCandidatesThisMonth >= limits.candidatesPerMonth)
    return { allowed: false, reason: 'candidate_limit', message: `You've reached ${limits.candidatesPerMonth} candidates this month.` }
  if (kind === 'interview' && tenant.usageInterviewsThisMonth >= limits.aiInterviewsPerMonth)
    return { allowed: false, reason: 'interview_limit', message: `You've reached ${limits.aiInterviewsPerMonth} AI interviews this month.` }
  if (kind === 'job') {
    const activeJobs = await prisma.hireJob.count({ where: { tenantId, status: 'ACTIVE' } })
    if (activeJobs >= limits.activeJobs) return { allowed: false, reason: 'job_limit', message: `Your plan allows ${limits.activeJobs} active jobs.` }
  }
  if (kind === 'seat') {
    const seats = await prisma.hireUser.count({ where: { tenantId } })
    if (seats >= limits.recruiters) return { allowed: false, reason: 'seat_limit', message: `Your plan allows ${limits.recruiters} recruiter seats.` }
  }
  return { allowed: true }
}

export async function incrementUsage(tenantId: string, kind: 'candidate' | 'interview') {
  await prisma.hireTenant.update({
    where: { id: tenantId },
    data: kind === 'candidate' ? { usageCandidatesThisMonth: { increment: 1 } } : { usageInterviewsThisMonth: { increment: 1 } },
  })
}
