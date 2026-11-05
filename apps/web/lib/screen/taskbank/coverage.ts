import type { SkillNode } from './types'
import { matchSkills } from './select'

// ── Adaptive skill coverage (Screen-scoped, isomorphic) ────────────────────
// Tracks which of the role's skills the interview has actually evidenced and
// turns that into guidance for the EXISTING adaptive brain:
//   • strong on the current skill  → (if a follow-up is warranted) go deeper
//   • weak / stuck on it           → don't keep drilling; it's covered as weak
//   • must-haves not yet assessed  → prioritise them before time runs out
// The room also uses `uncoveredKeys` to promote the next unasked question that
// targets an unassessed must-have (between-question adaptation).

export interface AnswerLike { questionText: string; techTag?: string; score: number }   // score 0–100

export interface SkillCoverage {
  covered: { id: string; name: string; answers: number; avg: number }[]
  strong: string[]
  weak: string[]
  uncoveredMustHaves: { id: string; name: string }[]
  uncoveredCore: { id: string; name: string }[]
  /** lower-case names + aliases of unassessed must-haves (for client-side question matching) */
  uncoveredKeys: string[]
}

export function computeCoverage(map: SkillNode[], answers: AnswerLike[], mustHaveIds: Set<string>, extra: { workSkills?: string[]; workScore?: number | null } = {}): SkillCoverage {
  const byId = new Map(map.map((s) => [s.id, s]))
  const agg = new Map<string, { n: number; sum: number }>()
  const add = (id: string, score: number) => { const a = agg.get(id) ?? { n: 0, sum: 0 }; a.n++; a.sum += score; agg.set(id, a) }
  for (const a of answers) {
    matchSkills([a.questionText, a.techTag ?? ''].filter(Boolean), map).forEach((id) => add(id, a.score))
  }
  // A completed work sample evidences its tagged skills too.
  for (const id of extra.workSkills ?? []) if (byId.has(id)) add(id, extra.workScore ?? 60)

  const covered = Array.from(agg.entries()).map(([id, a]) => ({ id, name: byId.get(id)?.name ?? id, answers: a.n, avg: Math.round(a.sum / a.n) }))
  const has = new Set(covered.map((c) => c.id))
  const uncoveredMustHaves = map.filter((s) => mustHaveIds.has(s.id) && !has.has(s.id)).map((s) => ({ id: s.id, name: s.name }))
  const uncoveredCore = map.filter((s) => s.priority === 1 && !mustHaveIds.has(s.id) && !has.has(s.id)).map((s) => ({ id: s.id, name: s.name }))
  return {
    covered,
    strong: covered.filter((c) => c.avg >= 75).map((c) => c.id),
    weak: covered.filter((c) => c.avg < 45).map((c) => c.id),
    uncoveredMustHaves, uncoveredCore,
    uncoveredKeys: uncoveredMustHaves.flatMap((u) => { const s = byId.get(u.id); return s ? [s.name.toLowerCase(), ...s.aliases] : [] }),
  }
}

/** Prompt block for evaluate-response (interviewer-only guidance). */
export function coverageGuidance(map: SkillNode[], cov: SkillCoverage, currentText: string, timeLeftSec: number | null): string {
  const byId = new Map(map.map((s) => [s.id, s]))
  const current = Array.from(matchSkills([currentText], map))
  const lines: string[] = []
  if (cov.covered.length) lines.push(`Skills evidenced so far: ${cov.covered.map((c) => `${c.name} (${c.avg}/100)`).join(', ')}.`)
  if (cov.uncoveredMustHaves.length) {
    const mins = timeLeftSec != null ? ` — about ${Math.max(0, Math.round(timeLeftSec / 60))} min left` : ''
    lines.push(`MUST-HAVE skills not yet assessed${mins}: ${cov.uncoveredMustHaves.map((u) => u.name).join(', ')}. Do not spend follow-ups on already-covered skills while these are open; advance so they can be reached.`)
  }
  for (const id of current) {
    const s = byId.get(id)
    if (!s) continue
    if (cov.strong.includes(id) && s.deeperProbes.length) lines.push(`Candidate is STRONG on ${s.name}. If a follow-up is warranted, go deeper rather than broader, e.g.: ${s.deeperProbes.slice(0, 2).join(' / ')}.`)
    if (cov.weak.includes(id)) lines.push(`Candidate is WEAK on ${s.name} — it is covered (as weak). Do not keep drilling; advance${s.adjacent.length ? ` (adjacent skills: ${s.adjacent.map((a) => byId.get(a)?.name ?? a).join(', ')})` : ''}.`)
  }
  return lines.length ? lines.join('\n') : ''
}
