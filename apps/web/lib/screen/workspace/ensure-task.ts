import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateWorkSampleTask } from './generate-task'
import { candidatesForPosition } from '@/lib/screen/taskbank/position-select'
import { bankTaskToWorkSample } from '@/lib/screen/taskbank/select'

// Draft + store a work-sample task for a position (idempotent unless `force`).
// Fire-and-forget from the position APIs; awaited by the regenerate route.
export async function ensureWorkSampleTask(positionId: string, force = false): Promise<{ ok: boolean; verified: boolean; note: string }> {
  try {
    const p = await prisma.position.findUnique({
      where: { id: positionId },
      select: { title: true, company: true, experienceLevel: true, techStack: true, jdText: true, primaryDomain: true, workSampleTask: true, agencyId: true },
    })
    if (!p) return { ok: false, verified: false, note: 'Position not found' }
    if (p.workSampleTask && !force) return { ok: true, verified: true, note: 'Task already present' }
    // 1. Prefer a human-reviewed, ACTIVE bank task that fits the role / skills / level.
    if (p.agencyId) {
      const c = await candidatesForPosition(positionId, p.agencyId)
      const best = c?.ranked.find((r) => r.score > 0)
      if (best) {
        const snap = bankTaskToWorkSample(best.task, { preferLanguage: null, approvedBy: 'task bank (reviewed)' })
        await prisma.position.update({ where: { id: positionId }, data: { workSampleTask: snap as unknown as Prisma.InputJsonValue } })
        console.info('[work-sample] bank task selected', JSON.stringify({ positionId, taskId: best.task.id, score: best.score }))
        return { ok: true, verified: true, note: `Selected "${best.task.title}" from the task bank` }
      }
    }
    // 2. Fall back to a generated DRAFT — it is not used live until a recruiter approves it.
    const { task, verified, note } = await generateWorkSampleTask(p)
    if (!task) return { ok: false, verified: false, note }
    await prisma.position.update({ where: { id: positionId }, data: { workSampleTask: task as unknown as Prisma.InputJsonValue } })
    console.info('[work-sample] generated draft stored', JSON.stringify({ positionId, verified, note }))
    return { ok: true, verified, note: `${note}. Generated draft — approve it before it is used in interviews` }
  } catch (e) {
    console.error('[work-sample] generation failed:', e instanceof Error ? e.message : e)
    return { ok: false, verified: false, note: 'Generation failed' }
  }
}
