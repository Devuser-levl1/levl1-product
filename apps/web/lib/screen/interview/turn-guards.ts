// ── Voice turn-taking guards (Screen-scoped, isomorphic) ───────────────────
// Two real-user bugs live here:
//   #3 a thinking pause ended the candidate's turn → endsMidThought() lets the
//      STT wait longer when the answer so far clearly isn't finished.
//   #5 a false barge-in (Ananya's own voice / noise picked up by the mic) cut a
//      question off, and that buffered echo was transcribed as the "answer" →
//      isLikelyEcho() catches a capture that is really the interrupted line.

// Words a finished sentence rarely ends on — the speaker is mid-thought.
const TRAILING = new Set([
  'and', 'but', 'so', 'or', 'because', 'cause', 'like', 'then', 'which', 'that', 'who', 'where', 'when', 'while', 'if', 'than',
  'the', 'a', 'an', 'to', 'of', 'for', 'with', 'in', 'on', 'at', 'from', 'by', 'about', 'into', 'as', 'also', 'plus',
  'um', 'uh', 'er', 'erm', 'hmm', 'basically', 'actually', 'is', 'are', 'was', 'were', 'be', 'i', 'we', 'my', 'our', 'it', "it's", 'its',
  'would', 'will', 'can', 'could', 'should', 'might', 'do', 'did', 'have', 'has', 'had', 'let', "let's", 'maybe', 'just',
])

/**
 * Does the answer so far look unfinished? True when it ends on a connective /
 * article / filler, or (for ≥3 words) has no terminal punctuation at all.
 * Scribe v3 punctuates committed text, so a missing full stop is a real signal.
 */
export function endsMidThought(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  const words = t.split(/\s+/)
  const last = words[words.length - 1].toLowerCase().replace(/[^a-z']/g, '')
  if (TRAILING.has(last)) return true
  if (/[,;:\-–—…]$/.test(t)) return true
  if (words.length >= 3 && !/[.?!]["')\]]*$/.test(t)) return true
  return false
}

const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3)

/** Share of the captured words (≥3 letters) that appear in the interviewer's line. */
export function echoOverlap(captured: string, line: string): number {
  const cap = tokens(captured)
  if (!cap.length) return 0
  const ref = new Set(tokens(line))
  return cap.filter((w) => ref.has(w)).length / cap.length
}

/** A capture right after a barge-in that is mostly the interrupted line itself = echo, not the candidate. */
export function isLikelyEcho(captured: string, interruptedLine: string): boolean {
  return tokens(captured).length >= 3 && echoOverlap(captured, interruptedLine) >= 0.6
}

/** Does a capture carry real words (not just a breath / "um")? */
export const hasRealWords = (s: string) => tokens(s).some((w) => !['umm', 'hmm', 'uhh', 'erm'].includes(w)) || /\b(yes|no|ok|okay|sure)\b/i.test(s)
