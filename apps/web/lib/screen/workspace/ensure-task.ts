import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateWorkSampleTask } from './generate-task'

// Draft + store a work-sample task for a position (idempotent unless `force`).
// Fire-and-forget from the position APIs; awaited by the regenerate route.
export async function ensureWorkSampleTask(positionId: string, force = false): Promise<{ ok: boolean; verified: boolean; note: string }> {
  try {
    const p = await prisma.position.findUnique({
      where: { id: positionId },
      select: { title: true, company: true, experienceLevel: true, techStack: true, jdText: true, primaryDomain: true, workSampleTask: true },
    })
    if (!p) return { ok: false, verified: false, note: 'Position not found' }
    if (p.workSampleTask && !force) return { ok: true, verified: true, note: 'Task already present' }
    const { task, verified, note } = await generateWorkSampleTask(p)
    if (!task) return { ok: false, verified: false, note }
    await prisma.position.update({ where: { id: positionId }, data: { workSampleTask: task as unknown as Prisma.InputJsonValue } })
    console.info('[work-sample] task stored', JSON.stringify({ positionId, verified, note }))
    return { ok: true, verified, note }
  } catch (e) {
    console.error('[work-sample] generation failed:', e instanceof Error ? e.message : e)
    return { ok: false, verified: false, note: 'Generation failed' }
  }
}
