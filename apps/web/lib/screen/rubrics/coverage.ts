import type { SkillNode } from '@/lib/screen/taskbank/types'
import type { SkillCoverage } from '@/lib/screen/taskbank/coverage'
import type { SelectedRubric } from './types'

// ── Selected rubrics → live interview coverage (Screen-scoped, isomorphic) ─
// Each selected rubric becomes a skill node in the EXISTING coverage engine
// (lib/screen/taskbank/coverage.ts): keywords are its aliases, probes are its
// go-deeper angles, tier sets priority. Must-have rubrics join the must-have
// set, so the brain pushes to assess them before time runs out and the room
// promotes questions that target them. Good-to-haves come next; add-ons only
// when must-haves are covered and time remains.

export const RUBRIC_NODE_PREFIX = 'rubric-'
const PRIORITY = { must: 1, good: 2, addon: 3 } as const

export function rubricSkillNodes(selection: SelectedRubric[]): SkillNode[] {
  return selection.map((r) => ({
    id: `${RUBRIC_NODE_PREFIX}${r.rubricId}`,
    name: r.subSkill,
    aliases: Array.from(new Set(r.keywords.map((k) => k.toLowerCase()))),
    priority: PRIORITY[r.tier],
    dependsOn: [], adjacent: [],
    deeperProbes: r.probes.map((p) => p.question).slice(0, 3),
  }))
}

export const mustRubricIds = (selection: SelectedRubric[]) => new Set(selection.filter((r) => r.tier === 'must').map((r) => `${RUBRIC_NODE_PREFIX}${r.rubricId}`))

/** Extra interviewer guidance for good-to-have / add-on rubrics (must-haves are covered by coverageGuidance). */
export function rubricTierGuidance(selection: SelectedRubric[], cov: SkillCoverage, timeLeftSec: number | null): string {
  const covered = new Set(cov.covered.map((c) => c.id))
  const open = (tier: 'good' | 'addon') => selection.filter((r) => r.tier === tier && !covered.has(`${RUBRIC_NODE_PREFIX}${r.rubricId}`))
  const good = open('good'), addon = open('addon')
  const mustOpen = cov.uncoveredMustHaves.some((u) => u.id.startsWith(RUBRIC_NODE_PREFIX))
  const lines: string[] = []
  const must = selection.filter((r) => r.tier === 'must')
  if (must.length) lines.push(`SELECTED MUST-HAVE RUBRICS (assess each before anything else): ${must.map((r) => `${r.subSkill} — ${r.statement}`).join(' | ')}`)
  if (good.length) lines.push(`Good-to-have rubrics not yet assessed (only after the must-haves): ${good.map((r) => r.subSkill).join(', ')}.`)
  const minutes = timeLeftSec != null ? timeLeftSec / 60 : null
  if (addon.length && !mustOpen && (minutes == null || minutes > 4)) lines.push(`Optional add-on rubrics, only if time remains: ${addon.map((r) => r.subSkill).join(', ')}.`)
  return lines.join('\n')
}
