import { prisma } from '@/lib/prisma'
import { baselineResumeSummary } from '@/lib/hire/ai'
import type { Prisma } from '@prisma/client'

// Baseline résumé summary for candidates imported WITHOUT a job. Gives them a
// neutral AI summary + skills so they aren't blank; JD-scoring is deferred until
// they're attached to a job.
export const BASELINE_SUMMARY_JOB = 'hire-baseline-summary'

export async function baselineSummaryHandler(data: { candidateId: string }) {
  const startedAt = Date.now()
  console.log('[hire-baseline-summary] STARTED candidate=%s', data.candidateId)

  const candidate = await prisma.hireCandidate.findUnique({ where: { id: data.candidateId } })
  if (!candidate || !candidate.resumeText) {
    console.warn('[hire-baseline-summary] SKIPPED candidate=%s — %s', data.candidateId, !candidate ? 'not found' : 'no resumeText')
    return
  }
  // If a JD score already ran, don't overwrite it with the baseline summary.
  if (candidate.aiScore != null) {
    console.log('[hire-baseline-summary] SKIPPED candidate=%s — already JD-scored', data.candidateId)
    return
  }

  const { summary, topSkills } = await baselineResumeSummary(candidate.resumeText)
  const existingSkills = Array.isArray(candidate.skills) ? (candidate.skills as string[]) : []
  await prisma.hireCandidate.update({
    where: { id: data.candidateId },
    data: {
      ...(summary ? { aiSummary: summary } : {}),
      // Two tiers: the baseline's headline skills go to `topSkills`; the full
      // résumé `skills` (from import extraction) is preserved, filled only if empty.
      ...(topSkills.length ? { topSkills: topSkills as Prisma.InputJsonValue } : {}),
      ...(existingSkills.length === 0 && topSkills.length ? { skills: topSkills as Prisma.InputJsonValue } : {}),
    },
  })
  console.log('[hire-baseline-summary] COMPLETED candidate=%s skills=%d in %dms', data.candidateId, topSkills.length, Date.now() - startedAt)
}
