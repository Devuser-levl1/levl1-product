import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SAMPLE_RUBRICS } from './seed'
import { sanitizeKeywords, sanitizeProbes, snapshotOf, type RubricContent, type RubricTier, type SelectedRubric } from './types'

// ── Rubric library data access (Screen-scoped, server-only) ────────────────
// Agency-scoped like the task bank. Levl1 samples are copied INTO the agency as
// draft + isSample and reviewed like any rubric.

export const RUBRIC_CONTENT_SELECT = {
  id: true, area: true, subSkill: true, proficientIn: true, ableTo: true, practices: true,
  strong: true, weak: true, keywords: true, probes: true,
} as const

export function rowToContent(r: { id: string; area: string; subSkill: string; proficientIn: string; ableTo: string; practices: string; strong: string; weak: string; keywords: string[]; probes: Prisma.JsonValue | null }): RubricContent & { id: string } {
  return { ...r, keywords: sanitizeKeywords(r.keywords), probes: sanitizeProbes(r.probes) }
}

/** Idempotent: an unreviewed sample draft is refreshed in place; anything reviewed/edited is never touched. */
export async function loadSampleRubrics(agencyId: string, createdBy: string) {
  let created = 0, updated = 0, skipped = 0
  for (const s of SAMPLE_RUBRICS) {
    const { key, ...content } = s
    const data = { ...content, probes: content.probes as unknown as Prisma.InputJsonValue, contentKey: key, isSample: true }
    const existing = await prisma.rubricLibraryItem.findFirst({ where: { agencyId, contentKey: key }, select: { id: true, status: true, isSample: true } })
    if (existing) {
      if (existing.status !== 'draft' || !existing.isSample) { skipped++; continue }
      await prisma.rubricLibraryItem.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.rubricLibraryItem.create({ data: { ...data, agencyId, status: 'draft', createdBy } })
      created++
    }
  }
  return { created, updated, skipped }
}

/**
 * Turn a client selection (ids + tiers) into stored snapshots. Newly added
 * rubrics must be ACTIVE in this agency's library; rubrics already on the
 * position keep their snapshot even if later retired (the position was set up
 * with reviewed content). Returns an error naming any rubric that can't be used.
 */
export async function buildSelection(agencyId: string, req: { rubricId: string; tier: RubricTier; source: 'jd' | 'manual' }[], previous: SelectedRubric[] = []):
  Promise<{ ok: true; selection: SelectedRubric[] } | { ok: false; error: string }> {
  const prev = new Map(previous.map((p) => [p.rubricId, p]))
  const fresh = req.filter((r) => !prev.has(r.rubricId)).map((r) => r.rubricId)
  const rows = fresh.length
    ? await prisma.rubricLibraryItem.findMany({ where: { agencyId, id: { in: fresh } }, select: { ...RUBRIC_CONTENT_SELECT, status: true } })
    : []
  const byId = new Map(rows.map((r) => [r.id, r]))
  const out: SelectedRubric[] = []
  for (const r of req) {
    const kept = prev.get(r.rubricId)
    if (kept) { out.push({ ...kept, tier: r.tier }); continue }
    const row = byId.get(r.rubricId)
    if (!row) return { ok: false, error: 'One of the selected rubrics no longer exists in your library.' }
    if (row.status !== 'active') return { ok: false, error: `"${row.subSkill}" isn't active yet — only reviewed, active rubrics can be used in interviews.` }
    out.push(snapshotOf(rowToContent(row), r.tier, r.source))
  }
  return { ok: true, selection: out }
}
