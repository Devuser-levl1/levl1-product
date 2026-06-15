import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { computeTimeInStage } from '@/lib/hire/analytics'

// ── MCP shared query layer (Build 4) ───────────────────────────────────────
// THE single place tenant scoping is enforced for MCP tools. Every function
// takes tenantId as its first argument and every query filters by it (directly
// or by joining through hireCandidate.tenantId). Tools never query Prisma
// directly. Read-only — no mutations.

export async function listJobs(tenantId: string) {
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId },
    select: { id: true, title: true, status: true, location: true, stages: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const candidates = await prisma.hireCandidate.findMany({ where: { tenantId }, select: { jobId: true, currentStage: true } })
  return jobs.map((j) => {
    const mine = candidates.filter((c) => c.jobId === j.id)
    const stages = Array.isArray(j.stages) ? (j.stages as string[]) : []
    return {
      id: j.id,
      title: j.title,
      status: j.status,
      location: j.location,
      totalCandidates: mine.length,
      stageCounts: stages.map((s) => ({ stage: s, count: mine.filter((c) => c.currentStage === s).length })),
    }
  })
}

export async function searchCandidates(tenantId: string, args: { jobId?: string; stage?: string; minScore?: number; keyword?: string; limit?: number }) {
  const where: Prisma.HireCandidateWhereInput = { tenantId }
  if (args.jobId) where.jobId = args.jobId
  if (args.stage) where.currentStage = args.stage
  if (typeof args.minScore === 'number') where.aiScore = { gte: args.minScore }
  if (args.keyword) where.OR = [
    { name: { contains: args.keyword, mode: 'insensitive' } },
    { email: { contains: args.keyword, mode: 'insensitive' } },
    { currentTitle: { contains: args.keyword, mode: 'insensitive' } },
    { currentCompany: { contains: args.keyword, mode: 'insensitive' } },
  ]
  const limit = Math.min(50, Math.max(1, args.limit ?? 25))
  const rows = await prisma.hireCandidate.findMany({
    where,
    select: { id: true, name: true, currentTitle: true, currentCompany: true, currentStage: true, aiScore: true, interviewScore: true, aiRecommendation: true, job: { select: { title: true } } },
    orderBy: [{ aiScore: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
  return {
    count: rows.length,
    cappedAt: limit,
    candidates: rows.map((c) => ({
      id: c.id, name: c.name, title: c.currentTitle, company: c.currentCompany,
      stage: c.currentStage, aiScore: c.aiScore, interviewScore: c.interviewScore,
      recommendation: c.aiRecommendation, job: c.job?.title ?? null,
    })),
  }
}

export async function getCandidate(tenantId: string, candidateId: string) {
  const c = await prisma.hireCandidate.findFirst({
    where: { id: candidateId, tenantId },
    include: {
      job: { select: { title: true } },
      enrichment: true,
    },
  })
  if (!c) return null
  return {
    id: c.id, name: c.name, email: c.email, phone: c.phone,
    title: c.currentTitle, company: c.currentCompany, location: null,
    stage: c.currentStage, job: c.job?.title ?? null,
    aiScore: c.aiScore, aiRecommendation: c.aiRecommendation, aiSummary: c.aiSummary,
    skills: Array.isArray(c.skills) ? c.skills : [],
    enrichment: c.enrichment ? {
      roleFamily: c.enrichment.roleFamily, status: c.enrichment.status,
      profile: c.enrichment.profile, company: c.enrichment.company, github: c.enrichment.github,
      links: c.enrichment.links, summary: c.enrichment.summary, sources: c.enrichment.sources,
    } : null,
  }
}

export async function getInterviewReport(tenantId: string, interviewId: string) {
  // A scheduled interview + its recruiter scorecard (tenant-scoped via candidate).
  const interview = await prisma.hireInterview.findFirst({
    where: { id: interviewId, candidate: { tenantId } },
    include: { candidate: { select: { name: true, job: { select: { title: true } } } } },
  })
  if (!interview) return null
  return {
    interviewId: interview.id,
    candidate: interview.candidate.name,
    job: interview.candidate.job?.title ?? null,
    type: interview.type,
    status: interview.status,
    scheduledAt: interview.scheduledAt,
    interviewers: interview.interviewers,
    scorecard: interview.scorecard,
  }
}

export async function pipelineSummary(tenantId: string, args: { jobId?: string }) {
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId, ...(args.jobId ? { id: args.jobId } : {}) },
    select: { id: true, title: true, stages: true },
  })
  const jobIds = jobs.map((j) => j.id)
  const candidates = await prisma.hireCandidate.findMany({ where: { tenantId, jobId: { in: jobIds } }, select: { jobId: true, currentStage: true } })
  const activities = await prisma.hireCandidateActivity.findMany({
    where: { candidate: { tenantId, ...(args.jobId ? { jobId: args.jobId } : {}) }, type: 'stage_change' },
    select: { id: true, type: true, fromStage: true, toStage: true, userId: true, createdAt: true, candidateId: true },
    take: 5000,
  })
  const timeInStage = computeTimeInStage(activities)
  const outliers = timeInStage.filter((t) => t.avgDays > 7).sort((a, b) => b.avgDays - a.avgDays)
  return {
    jobs: jobs.map((j) => {
      const mine = candidates.filter((c) => c.jobId === j.id)
      const stages = Array.isArray(j.stages) ? (j.stages as string[]) : []
      return { id: j.id, title: j.title, total: mine.length, stageCounts: stages.map((s) => ({ stage: s, count: mine.filter((c) => c.currentStage === s).length })) }
    }),
    timeInStage,
    slowStages: outliers,
  }
}

export async function recentActivity(tenantId: string, args: { days?: number }) {
  const days = Math.min(90, Math.max(1, args.days ?? 7))
  const cutoff = new Date(Date.now() - days * 86400000)
  const completed = await prisma.hireInterview.findMany({
    where: { candidate: { tenantId }, status: 'COMPLETED', scheduledAt: { gte: cutoff } },
    include: { candidate: { select: { name: true, job: { select: { title: true } } } } },
    orderBy: { scheduledAt: 'desc' },
    take: 50,
  })
  return {
    sinceDays: days,
    completedInterviews: completed.map((i) => ({
      candidate: i.candidate.name,
      job: i.candidate.job?.title ?? null,
      type: i.type,
      scorecard: i.scorecard,
      completedAt: i.scheduledAt,
    })),
  }
}
