import { prisma } from '@/lib/prisma'
import { rankTasks, type RankedTask } from './select'
import { skillMapForPosition, TASK_WITH_RUBRIC } from './store'

// Ranked ACTIVE bank tasks for a position (role + JD skills + must-haves + experience).
export async function candidatesForPosition(positionId: string, agencyId: string, opts: { includeInactive?: boolean } = {}): Promise<{ role: string | null; ranked: RankedTask[] } | null> {
  const p = await prisma.position.findFirst({
    where: { id: positionId, agencyId },
    select: { title: true, techStack: true, mustHaves: true, experienceMin: true, experienceMax: true },
  })
  if (!p) return null
  const { role, skills } = await skillMapForPosition(agencyId, p.title, p.techStack)
  const tasks = await prisma.taskBankItem.findMany({
    where: { agencyId, ...(opts.includeInactive ? { status: { not: 'retired' } } : { status: 'active' }) },
    include: TASK_WITH_RUBRIC,
  })
  const ranked = rankTasks(tasks, { title: p.title, techStack: p.techStack, mustHaves: p.mustHaves, experienceMin: p.experienceMin, experienceMax: p.experienceMax }, skills, opts)
  return { role, ranked }
}
