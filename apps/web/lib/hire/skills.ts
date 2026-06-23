// Client-safe skill-tag tidying. Résumé parsing sometimes yields descriptive
// phrases ("Some title search experience in US mortgage process",
// "MS Excel (VLOOKUP, Pivot Table)") instead of concise tags. These helpers
// condense a phrase into a short chip label for list/tag views.

const LEAD_QUALIFIER = /^(some|a little|a bit of|basic|good|strong|excellent|proven|hands[-\s]?on|working|solid|extensive|prior|previous|deep|broad|advanced|intermediate|beginner)\s+/i
const LEAD_DURATION = /^[\d.+\-–\s]*(?:\+)?\s*years?\b[^,]*?\bof\b\s+/i
const FILLER = /\b(experience|expertise|proficiency|proficient|knowledge|familiarity|familiar|exposure|understanding|background|skill(?:s|ed)?|ability|competenc(?:y|e))\b\s*(in|with|of|to|on|across|navigating)?\s*/gi
const LEAD_CONNECTIVE = /^(in|with|of|the|a|an|to|on|and)\s+/i

/** Condense a possibly-descriptive skill phrase into a concise tag label. */
export function tidySkill(raw: string): string {
  const original = (raw || '').replace(/\s+/g, ' ').trim()
  if (!original) return ''
  let s = original
  s = s.replace(/\s*\([^)]*\)/g, '')            // drop parentheticals: "MS Excel (VLOOKUP…)" → "MS Excel"
  s = s.replace(LEAD_DURATION, '')              // "3-5 years of hands-on …" → "…"
  s = s.replace(LEAD_QUALIFIER, '')             // "Some …", "hands-on …"
  s = s.replace(FILLER, '')                     // "… experience in …" → "… …"
  s = s.replace(/\s+/g, ' ').replace(LEAD_CONNECTIVE, '').replace(/[.,;:]+$/, '').trim()
  if (!s) s = original.replace(/\s*\([^)]*\)/g, '').trim() || original
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Tidy + length-cap for a chip; returns { label, full } so callers can tooltip. */
export function skillChip(raw: string, max = 26): { label: string; full: string } {
  const full = (raw || '').replace(/\s+/g, ' ').trim()
  let label = tidySkill(raw)
  if (label.length > max) {
    const cut = label.slice(0, max)
    const sp = cut.lastIndexOf(' ')
    label = (sp > 10 ? cut.slice(0, sp) : cut).trim() + '…'
  }
  return { label, full }
}

/** Prefer concise raw skills, fall back to the surfaced top skills. */
export function poolSkillSource(skills: unknown, topSkills: unknown): string[] {
  const s = Array.isArray(skills) ? (skills as string[]) : []
  const t = Array.isArray(topSkills) ? (topSkills as string[]) : []
  return (s.length ? s : t).filter((x) => typeof x === 'string' && x.trim())
}
