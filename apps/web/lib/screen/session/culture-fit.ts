// ── Likert culture/values-fit segment (Build 08, Screen-scoped) ────────────
// A short structured fit segment AFTER the Q&A, scored as a SEPARATE axis (never
// blended into the competency score — same principle as integrity). Items are
// configurable per position (Position.cultureFitItems); this file ships the
// generic default set + the scoring.

export interface LikertItem {
  id: string
  prompt: string
  dimension?: string   // e.g. "Ownership", "Collaboration"
  reverse?: boolean    // reverse-scored (disagreement is the positive signal)
}

export interface LikertResponse extends LikertItem {
  value: number        // 1–5 (Strongly disagree → Strongly agree)
  label: string        // the chosen option label
}

// 5-point Likert scale (shared by voice + on-screen).
export const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Somewhat agree' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
] as const

// Generic default item set (6 items, ~2–3 min). Behavioural + values fit, framed
// neutrally. Reverse-scored items guard against straight-lining.
export const DEFAULT_CULTURE_FIT_ITEMS: LikertItem[] = [
  { id: 'ownership',      dimension: 'Ownership',     prompt: 'I take full ownership of outcomes, even when a problem was not originally mine to solve.' },
  { id: 'feedback',       dimension: 'Growth',        prompt: 'I actively seek out critical feedback on my work and change course based on it.' },
  { id: 'collaboration',  dimension: 'Collaboration', prompt: 'I would rather get a strong result as a team than be individually recognised for it.' },
  { id: 'ambiguity',      dimension: 'Adaptability',  prompt: 'I am comfortable making progress when requirements are ambiguous or shifting.' },
  { id: 'pace_quality',   dimension: 'Judgment',      prompt: 'Shipping fast always matters more than getting the details right.', reverse: true },
  { id: 'transparency',   dimension: 'Integrity',     prompt: 'I raise problems and bad news early, even when it is uncomfortable to do so.' },
]

// Resolve the item set for a position: custom items if configured + valid, else
// the generic default. Defensive parse so a bad config never breaks the flow.
export function resolveCultureFitItems(custom: unknown): LikertItem[] {
  if (Array.isArray(custom)) {
    const items = custom
      .filter((it): it is { id?: unknown; prompt?: unknown; dimension?: unknown; reverse?: unknown } => !!it && typeof it === 'object')
      .map((it, i) => ({
        id: typeof it.id === 'string' && it.id ? it.id : `item_${i}`,
        prompt: typeof it.prompt === 'string' ? it.prompt : '',
        dimension: typeof it.dimension === 'string' ? it.dimension : undefined,
        reverse: it.reverse === true,
      }))
      .filter((it) => it.prompt.trim().length > 0)
    if (items.length >= 3) return items.slice(0, 8)  // keep it short (5–8)
  }
  return DEFAULT_CULTURE_FIT_ITEMS
}

// Score the responses on a SEPARATE 0–100 axis. Reverse items invert (6 - value).
export function scoreCultureFit(responses: LikertResponse[]): { fitScore: number; summary: string } {
  const valid = responses.filter((r) => typeof r.value === 'number' && r.value >= 1 && r.value <= 5)
  if (valid.length === 0) return { fitScore: 0, summary: 'No culture-fit responses were captured.' }
  const adjusted = valid.map((r) => (r.reverse ? 6 - r.value : r.value))
  const mean = adjusted.reduce((a, b) => a + b, 0) / adjusted.length
  const fitScore = Math.round(((mean - 1) / 4) * 100)  // 1→0, 5→100

  // Evidence-linked summary: strongest + weakest dimensions, not just the number.
  const byScore = valid
    .map((r) => ({ d: r.dimension ?? r.id, s: r.reverse ? 6 - r.value : r.value }))
    .sort((a, b) => b.s - a.s)
  const strong = byScore.filter((x) => x.s >= 4).map((x) => x.d)
  const weak = byScore.filter((x) => x.s <= 2).map((x) => x.d)
  const band = fitScore >= 75 ? 'a strong values alignment' : fitScore >= 50 ? 'a moderate values alignment' : 'a lower values alignment'
  let summary = `Self-reported culture/values fit indicates ${band} (${fitScore}/100, separate from competency).`
  if (strong.length) summary += ` Strongest on: ${Array.from(new Set(strong)).join(', ')}.`
  if (weak.length) summary += ` Lower on: ${Array.from(new Set(weak)).join(', ')}.`
  return { fitScore, summary }
}
