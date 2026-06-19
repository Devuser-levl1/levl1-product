// ── T2-3 Answer-cadence (read-aloud vs spontaneous) — Build 02-B ───────────
// CORROBORATING, never conclusive. Spontaneous spoken answers almost always
// carry disfluency — fillers ("um", "like"), hesitation, self-correction, and
// uneven phrasing. Reading an answer aloud (e.g. off an overlay assistant) is
// flatter: near-zero disfluency on a long, polished, multi-sentence delivery.
// We only flag that combination, conservatively, on a substantial answer.
//
// Pure + deterministic (no network) so it's cheap and unit-testable. Operates on
// the Scribe transcript text (verbatim — no_verbatim is off, so fillers survive).
// Evidence-linked: returns the measured rates + a rationale, never a bare verdict.

export interface CadenceInput {
  answer: string
  // Spoken answers only — typed/code answers have no prosody to judge.
  spoken?: boolean
}

export interface CadenceFlag {
  type: 'read_aloud_cadence'
  confidence: number
  rationale: string
  span: string
  meta: Record<string, unknown>
}

// Disfluency / hesitation / self-correction markers of natural speech.
const FILLERS = [
  'um', 'uh', 'erm', 'er', 'ah', 'hmm', 'mm', 'like', 'you know', 'i mean',
  'sort of', 'kind of', 'kinda', 'sorta', 'basically', 'actually', 'i guess',
  'i think', 'i suppose', 'right', 'so yeah', 'well', 'okay so', 'lemme', 'let me think',
  'wait', 'no sorry', 'i mean to say', 'how do i', "what's the word",
]

const MIN_WORDS = 35          // too short to judge cadence → skip
const LOW_DISFLUENCY = 0.012  // ~zero fillers per word on a long answer = read-aloud-like
const FLAG_CONF = 0.6

function countFillers(lower: string): number {
  let n = 0
  for (const f of FILLERS) {
    // word-boundary-ish match for multi/single tokens
    const re = new RegExp(`(^|[^a-z])${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'g')
    const m = lower.match(re)
    if (m) n += m.length
  }
  // Repeated-word stutters ("the the", "I I") are a disfluency too.
  const stutter = lower.match(/\b(\w+)\s+\1\b/g)
  if (stutter) n += stutter.length
  return n
}

export function analyzeCadence(input: CadenceInput): CadenceFlag | null {
  if (input.spoken === false) return null  // only judge spoken answers
  const answer = (input.answer ?? '').trim()
  const words = answer.split(/\s+/).filter(Boolean)
  if (words.length < MIN_WORDS) return null

  const lower = answer.toLowerCase()
  const fillers = countFillers(lower)
  const disfluencyRate = fillers / words.length
  const sentences = answer.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3)

  // Read-aloud signature: a long, multi-sentence, polished answer with essentially
  // NO disfluency. Either of those alone is fine; together they're corroborating.
  if (disfluencyRate <= LOW_DISFLUENCY && sentences.length >= 2) {
    // Confidence grows with length + structure, capped low (corroborating only).
    const confidence = Math.min(0.72, FLAG_CONF + Math.min(0.1, words.length / 1000) + Math.min(0.04, sentences.length * 0.01))
    return {
      type: 'read_aloud_cadence',
      confidence: Number(confidence.toFixed(2)),
      rationale: `A ${words.length}-word, ${sentences.length}-sentence spoken answer had near-zero disfluency (${(disfluencyRate * 100).toFixed(1)}% filler words) — flatter than typical spontaneous speech, consistent with reading aloud. Corroborating signal only.`,
      span: answer.slice(0, 180),
      meta: { wordCount: words.length, fillerCount: fillers, disfluencyRate: Number(disfluencyRate.toFixed(4)), sentenceCount: sentences.length },
    }
  }
  return null
}
