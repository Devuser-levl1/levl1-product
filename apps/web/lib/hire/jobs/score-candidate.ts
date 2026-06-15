import { prisma } from '@/lib/prisma'
import { scoreCandidate } from '@/lib/hire/ai'
import type { Prisma } from '@prisma/client'

export const JOB_NAME = 'hire-score-candidate'

export async function scoreCandidateHandler(data: { candidateId: string }) {
  const startedAt = Date.now()
  console.log('[hire-score-candidate] STARTED candidate=%s', data.candidateId)

  const candidate = await prisma.hireCandidate.findUnique({
    where: { id: data.candidateId },
    include: { job: true },
  })
  if (!candidate || !candidate.resumeText || !candidate.job) {
    console.warn('[hire-score-candidate] SKIPPED candidate=%s — %s', data.candidateId,
      !candidate ? 'candidate not found' : !candidate.resumeText ? 'no resumeText' : 'not attached to a job (no JD to score against)')
    return
  }

  const result = await scoreCandidate(candidate.resumeText, candidate.job.description, candidate.job.title)

  await prisma.hireCandidate.update({
    where: { id: data.candidateId },
    data: {
      aiScore: result.score,
      aiSummary: result.summary,
      aiRecommendation: result.recommendation,
      skills: result.topSkills as Prisma.InputJsonValue,
    },
  })

  await prisma.hireCandidateActivity.create({
    data: {
      candidateId: data.candidateId,
      type: 'ai_scored',
      note: `AI score: ${result.score}/100 — ${result.recommendation}`,
    },
  })

  console.log('[hire-score-candidate] COMPLETED candidate=%s score=%d rec=%s in %dms', data.candidateId, result.score, result.recommendation, Date.now() - startedAt)
}
