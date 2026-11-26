// ── One question per turn (Screen-scoped, isomorphic) ──────────────────────
// Real-user bug: the interviewer clubbed several asks into one turn ("Tell me
// about X, and also how would you handle Y, and what about Z?") — hard to
// follow, and the candidate lost which part to answer. Every generated line is
// now constrained in the PROMPT and enforced in CODE: keep the lead-in plus the
// FIRST question; the rest is returned so it can become a follow-up driven by
// the candidate's answer (not discarded, and not starved by the follow-up cap).

const WH = '(how|what|why|when|where|which|who|would|could|can|do|did|does|is|are|have|has|should|will)'
// ", and (also) how …" / "; what …" / " — and what …" starting a second ask inside one sentence.
const JOINER = new RegExp(`(?:,\\s*|;\\s*|\\s+[—–-]\\s+)(?:and\\s+)?(?:also\\s+)?(?:what about|${WH}\\b)`, 'i')

// The head clause opens like a question / prompt (after an optional "So," / "Okay," …).
const ASKS = new RegExp(`^\\s*(?:(?:so|okay|ok|and|now|great|right|alright)[,\\s]+)*(?:${WH}|tell me|walk me|talk me|describe|explain|share|give me)\\b`, 'i')

export interface SplitQuestion { text: string; rest: string[] }

/** Lead-in + the first question only. `rest` holds the other asks (as questions). */
export function oneQuestion(raw: string): SplitQuestion {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return { text, rest: [] }
  // Sentences, keeping their terminal punctuation.
  const sentences = text.match(/[^.?!]+[.?!]+["')\]]*|[^.?!]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text]
  const firstQ = sentences.findIndex((s) => s.includes('?'))
  if (firstQ < 0) return { text, rest: [] }
  const lead = sentences.slice(0, firstQ)
  let question = sentences[firstQ]
  const rest: string[] = sentences.slice(firstQ + 1).filter((s) => s.includes('?'))
  // A second ask joined inside the same sentence.
  // Only when the head is itself a question ("How did you X, and what Y?") — never
  // a lead-in clause ("After adding the cache, how did you measure it?").
  const m = JOINER.exec(question)
  if (m && m.index > 12 && ASKS.test(question.slice(0, m.index))) {
    const tail = question.slice(m.index).replace(/^[,;\s—–-]+(and\s+)?(also\s+)?/i, '')
    question = question.slice(0, m.index).replace(/[,;\s]+$/, '') + '?'
    const t = tail.trim().replace(/^./, (c) => c.toUpperCase())
    if (t.length > 3) rest.unshift(t.endsWith('?') ? t : `${t}?`)
  }
  return { text: [...lead, question].join(' ').trim(), rest: rest.slice(0, 3) }
}

/** How many asks a line contains (for tests / telemetry). */
export const questionCount = (s: string) => 1 + oneQuestion(s).rest.length - (s.includes('?') ? 0 : 1)
