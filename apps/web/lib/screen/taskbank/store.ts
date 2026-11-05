import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sanitizeRubric, sanitizeSkillMap, type SkillNode } from './types'
import { inferRole } from './select'
import { SAMPLE_SKILL_MAPS, SAMPLE_TASKS } from './samples'

// ── Task bank data access (Screen-scoped, server-only) ─────────────────────
// Every row is agency-scoped (no cross-tenant content). Sample content is
// copied INTO the agency as draft + isSample, so it is reviewed like any task.

export const TASK_WITH_RUBRIC = { rubric: { select: { criteria: true, probes: true } } } satisfies Prisma.TaskBankItemInclude

/** The role skill map for a position (agency map for the inferred role, if any). */
export async function skillMapForPosition(agencyId: string | null | undefined, title: string, techStack: string[] = []): Promise<{ role: string | null; skills: SkillNode[] }> {
  const role = inferRole(title, techStack)
  if (!agencyId || !role) return { role, skills: [] }
  const map = await prisma.roleSkillMap.findFirst({ where: { agencyId, role }, orderBy: [{ isSample: 'asc' }, { updatedAt: 'desc' }], select: { skills: true } })
  return { role, skills: map ? sanitizeSkillMap(map.skills) : [] }
}

/** Idempotently copy the sample tasks + skill maps into an agency (as drafts). */
export async function loadSamples(agencyId: string, createdBy: string) {
  let tasks = 0, maps = 0
  for (const t of SAMPLE_TASKS) {
    const exists = await prisma.taskBankItem.findFirst({ where: { agencyId, isSample: true, title: t.title }, select: { id: true } })
    if (exists) continue
    await prisma.taskBankItem.create({
      data: {
        agencyId, isSample: true, status: 'draft', createdBy,
        title: t.title, prompt: t.prompt, roles: t.roles, skills: t.skills, difficulty: t.difficulty,
        experienceMin: t.experienceMin, experienceMax: t.experienceMax, languages: t.languages,
        starterCode: t.starterCode as Prisma.InputJsonValue, tests: t.tests as unknown as Prisma.InputJsonValue,
        referenceSolution: t.referenceSolution, referenceLanguage: t.referenceLanguage, minutes: t.minutes,
        rubric: { create: { criteria: sanitizeRubric(t.rubric).criteria as unknown as Prisma.InputJsonValue, probes: sanitizeRubric(t.rubric).probes as unknown as Prisma.InputJsonValue } },
      },
    })
    tasks++
  }
  for (const m of SAMPLE_SKILL_MAPS) {
    const exists = await prisma.roleSkillMap.findFirst({ where: { agencyId, role: m.role }, select: { id: true } })
    if (exists) continue
    await prisma.roleSkillMap.create({ data: { agencyId, isSample: true, role: m.role, title: m.title, skills: sanitizeSkillMap(m.skills) as unknown as Prisma.InputJsonValue } })
    maps++
  }
  return { tasks, maps }
}
