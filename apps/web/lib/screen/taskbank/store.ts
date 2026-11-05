import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sanitizeRubric, sanitizeSkillMap, type SkillNode } from './types'
import { inferRole } from './select'
import { STARTER_SKILL_MAPS, STARTER_TASKS } from './content'

// ── Task bank data access (Screen-scoped, server-only) ─────────────────────
// Every row is agency-scoped (no cross-tenant content). Levl1 starter content is
// copied INTO the agency as draft + isSample, so it is reviewed like any task.

export const TASK_WITH_RUBRIC = { rubric: { select: { criteria: true, probes: true } } } satisfies Prisma.TaskBankItemInclude

/** The role skill map for a position (agency map for the inferred role, if any). */
export async function skillMapForPosition(agencyId: string | null | undefined, title: string, techStack: string[] = []): Promise<{ role: string | null; skills: SkillNode[] }> {
  const role = inferRole(title, techStack)
  if (!agencyId || !role) return { role, skills: [] }
  const map = await prisma.roleSkillMap.findFirst({ where: { agencyId, role }, orderBy: [{ isSample: 'asc' }, { updatedAt: 'desc' }], select: { skills: true } })
  return { role, skills: map ? sanitizeSkillMap(map.skills) : [] }
}

/**
 * Load / upgrade Levl1 starter content into an agency. Idempotent and safe:
 *  • tasks: an unreviewed Levl1 draft (incl. legacy "(SAMPLE)" rows) is updated
 *    in place; reviewed / active / retired tasks are NEVER touched; else created as draft.
 *  • skill maps: an untouched Levl1 map is refreshed; an agency-edited map only
 *    GAINS aliases (and missing skills) — nothing is removed; missing roles are created.
 */
export async function loadStarterContent(agencyId: string, createdBy: string) {
  let created = 0, updated = 0, skipped = 0, mapsCreated = 0, mapsUpdated = 0
  for (const t of STARTER_TASKS) {
    const existing = await prisma.taskBankItem.findFirst({
      where: { agencyId, OR: [{ contentKey: t.key }, ...(t.legacyTitle ? [{ isSample: true, title: t.legacyTitle }] : [])] },
      select: { id: true, status: true, isSample: true },
    })
    const rubric = sanitizeRubric(t.rubric)
    const data = {
      title: t.title, prompt: t.prompt, roles: t.roles, skills: t.skills, difficulty: t.difficulty,
      experienceMin: t.experienceMin, experienceMax: t.experienceMax, languages: t.languages,
      starterCode: t.starterCode as Prisma.InputJsonValue, tests: t.tests as unknown as Prisma.InputJsonValue,
      referenceSolution: t.referenceSolution, referenceLanguage: t.referenceLanguage, minutes: t.minutes,
      contentKey: t.key, isSample: true, qaEvidence: t.qa as unknown as Prisma.InputJsonValue,
    }
    const rubricData = { criteria: rubric.criteria as unknown as Prisma.InputJsonValue, probes: rubric.probes as unknown as Prisma.InputJsonValue }
    if (existing) {
      if (existing.status !== 'draft' || !existing.isSample) { skipped++; continue }
      await prisma.taskBankItem.update({ where: { id: existing.id }, data: { ...data, lastVerifiedAt: null, rubric: { upsert: { create: rubricData, update: rubricData } } } })
      updated++
    } else {
      await prisma.taskBankItem.create({ data: { ...data, agencyId, status: 'draft', createdBy, rubric: { create: rubricData } } })
      created++
    }
  }
  for (const m of STARTER_SKILL_MAPS) {
    const fresh = sanitizeSkillMap(m.skills)
    const existing = await prisma.roleSkillMap.findFirst({ where: { agencyId, role: m.role }, orderBy: { updatedAt: 'desc' }, select: { id: true, isSample: true, skills: true } })
    if (!existing) {
      await prisma.roleSkillMap.create({ data: { agencyId, isSample: true, role: m.role, title: m.title, skills: fresh as unknown as Prisma.InputJsonValue } })
      mapsCreated++
    } else if (existing.isSample) {
      await prisma.roleSkillMap.update({ where: { id: existing.id }, data: { title: m.title, skills: fresh as unknown as Prisma.InputJsonValue } })
      mapsUpdated++
    } else {
      const merged = mergeSkillMaps(sanitizeSkillMap(existing.skills), fresh)
      await prisma.roleSkillMap.update({ where: { id: existing.id }, data: { skills: merged as unknown as Prisma.InputJsonValue } })
      mapsUpdated++
    }
  }
  return { created, updated, skipped, mapsCreated, mapsUpdated }
}

/** Additive merge: keep every agency edit, add missing aliases / probes / skills from Levl1 content. */
export function mergeSkillMaps(mine: SkillNode[], theirs: SkillNode[]): SkillNode[] {
  const out = mine.map((s) => ({ ...s }))
  for (const t of theirs) {
    const m = out.find((s) => s.id === t.id)
    if (!m) { out.push(t); continue }
    m.aliases = Array.from(new Set([...m.aliases, ...t.aliases]))
    if (!m.deeperProbes.length) m.deeperProbes = t.deeperProbes
    if (!m.adjacent.length) m.adjacent = t.adjacent
  }
  return out
}
