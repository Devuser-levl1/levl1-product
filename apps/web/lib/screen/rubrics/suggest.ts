import { canonicalSkill, normTerm } from '@/lib/screen/tech-terms'
import type { RubricTier } from './types'

// ── JD → rubric suggestions (Screen-scoped, isomorphic, deterministic) ─────
// Suggests ACTIVE library rubrics for a position, with a default tier, from the
// JD-parsed skills. The recruiter confirms or overrides — nothing is selected
// silently. Explainable: every suggestion lists the terms that matched.
//   keyword in tech stack / must-haves  → Must-have
//   keyword in nice-to-haves            → Good-to-have
//   keyword only mentioned in the JD    → Add-on

export interface SuggestInput { techStack?: string[]; mustHaves?: string[]; goodToHave?: string[]; jdText?: string | null; title?: string }
export interface LibraryLite { id: string; area: string; subSkill: string; keywords: string[] }
export interface RubricSuggestion { rubricId: string; tier: RubricTier; matched: string[]; reason: string }

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function mentions(hayNorm: string, kw: string): boolean {
  const k = normTerm(kw)
  if (k.length < 2) return false
  return new RegExp(`(?<![a-z0-9.])${esc(k)}(?![a-z0-9+#])`, 'i').test(hayNorm)
}

function canonSet(items: string[]): Set<string> {
  const s = new Set<string>()
  for (const i of items) { const c = canonicalSkill(i); if (c) s.add(c.toLowerCase()); s.add(normTerm(i)) }
  return s
}

function hit(kw: string, canon: Set<string>, textNorm: string): boolean {
  const c = canonicalSkill(kw)
  // Canonical match only when the keyword IS the canonical name ("C#", ".NET").
  // Dialect aliases ("T-SQL" → SQL) must match literally, or a PL/SQL role would
  // pull in a SQL Server rubric.
  if (c && normTerm(c) === normTerm(kw) && canon.has(c.toLowerCase())) return true
  if (canon.has(normTerm(kw))) return true
  return mentions(textNorm, kw)
}

export function suggestRubrics(pos: SuggestInput, library: LibraryLite[], max = 12): RubricSuggestion[] {
  const required = [...(pos.techStack ?? []), ...(pos.mustHaves ?? [])]
  const reqCanon = canonSet(pos.techStack ?? [])
  const reqText = ` ${normTerm(required.join(' . '))} `
  const goodCanon = canonSet(pos.goodToHave ?? [])
  const goodText = ` ${normTerm((pos.goodToHave ?? []).join(' . '))} `
  const jdText = ` ${normTerm(`${pos.title ?? ''} . ${pos.jdText ?? ''}`)} `

  const out: (RubricSuggestion & { weight: number })[] = []
  for (const r of library) {
    const kws = [r.subSkill, ...r.keywords]
    const req = kws.filter((k) => hit(k, reqCanon, reqText))
    const good = req.length ? [] : kws.filter((k) => hit(k, goodCanon, goodText))
    const jd = req.length || good.length ? [] : kws.filter((k) => mentions(jdText, k))
    const tier: RubricTier | null = req.length ? 'must' : good.length ? 'good' : jd.length ? 'addon' : null
    if (!tier) continue
    const matched = Array.from(new Set(req.length ? req : good.length ? good : jd)).slice(0, 5)
    const where = tier === 'must' ? 'required skills' : tier === 'good' ? 'nice-to-haves' : 'the JD text'
    out.push({ rubricId: r.id, tier, matched, reason: `Matched ${matched.join(', ')} in ${where}`, weight: (tier === 'must' ? 100 : tier === 'good' ? 50 : 10) + matched.length })
  }
  return out.sort((a, b) => b.weight - a.weight).slice(0, max).map((s) => ({ rubricId: s.rubricId, tier: s.tier, matched: s.matched, reason: s.reason }))
}
