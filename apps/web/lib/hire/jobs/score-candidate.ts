import { prisma } from '@/lib/prisma'
import { scoreCandidateForJob, verdictToRecommendation } from '@/lib/hire/ai-matching'
import type { Prisma } from '@prisma/client'

export const JOB_NAME = 'hire-score-candidate'

// SINGLE scoring path: a candidate is scored against their attached job through
// the P0-3 matching service, which upserts the canonical HireMatch row. We also
// mirror the score onto the candidate (aiScore / aiRecommendation / topSkills)
// so legacy displays + analytics read the SAME number as the HireMatch row.
export async function scoreCandidateHandler(data: { candidateId: string }) {
  const startedAt = Date.now()
  console.log('[hire-score-candidate] STARTED candidate=%s', data.candidateId)

  const candidate = await prisma.hireCandidate.findUnique({
    where: { id: data.candidateId },
    select: { id: true, tenantId: true, jobId: true, resumeText: true, skills: true, job: { select: { title: true } } },
  })
  if (!candidate || !candidate.resumeText || !candidate.jobId) {
    console.warn('[hire-score-candidate] SKIPPED candidate=%s — %s', data.candidateId,
      !candidate ? 'candidate not found' : !candidate.resumeText ? 'no resumeText' : 'not attached to a job (no JD to score against)')
    return
  }

  const match = await scoreCandidateForJob(candidate.tenantId, candidate.id, candidate.jobId)
  if (!match) {
    console.warn('[hire-score-candidate] no match produced for candidate=%s', data.candidateId)
    return
  }

  // Mirror onto the candidate so the Candidates list / Kanban / popup show the
  // SAME score as the HireMatch row (it IS that score for their attached job).
  const existingSkills = Array.isArray(candidate.skills) ? (candidate.skills as string[]) : []
  await prisma.hireCandidate.update({
    where: { id: candidate.id },
    data: {
      aiScore: match.score,
      aiRecommendation: verdictToRecommendation(match.verdict),
      aiSummary: match.reasons.join(' '),
      topSkills: match.matchedSkills as Prisma.InputJsonValue,
      ...(existingSkills.length === 0 && match.matchedSkills.length ? { skills: match.matchedSkills as Prisma.InputJsonValue } : {}),
    },
  })

  await prisma.hireCandidateActivity.create({
    data: { candidateId: candidate.id, type: 'ai_scored', note: `Match: ${match.score}/100 (${match.verdict}) vs ${candidate.job?.title ?? 'job'}` },
  })

  console.log('[hire-score-candidate] COMPLETED candidate=%s match=%d verdict=%s in %dms', candidate.id, match.score, match.verdict, Date.now() - startedAt)
}
