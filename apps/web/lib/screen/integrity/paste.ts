// ── T2-3 Paste-origin analysis (Screen-scoped, Build 02) ───────────────────
// Distinguishes a plausible small snippet the candidate typed/adapted from a
// large pre-formed block pasted wholesale (especially right after a blur).
// Stores ONLY paste metadata (size/count/timing) — never the clipboard text.

export interface PasteInput {
  largestPasteChars?: number     // biggest single paste action
  totalPastedChars?: number      // sum across paste actions
  pasteCount?: number
  typedChars?: number            // chars entered by typing (not paste)
  answerLength?: number          // final answer length
  precedingBlurMs?: number | null // ms since a tab/window blur just before the paste (Build 01 correlate)
}

export interface PasteFlag {
  type: 'paste_anomaly'
  confidence: number
  rationale: string
  meta: Record<string, unknown>
}

// A small snippet (≤ this) is normal — people paste a signature, a variable, a
// URL. The tell is a large block arriving in one action.
const PLAUSIBLE_SNIPPET = 120
const LARGE_BLOCK = 240

export function analyzePaste(input: PasteInput): PasteFlag | null {
  const largest = input.largestPasteChars ?? 0
  if (largest <= PLAUSIBLE_SNIPPET) return null  // small paste → not suspicious

  const typed = input.typedChars ?? 0
  const answer = input.answerLength ?? Math.max(largest, typed)
  const pastedShare = answer > 0 ? Math.min(1, (input.totalPastedChars ?? largest) / answer) : 1
  const blur = input.precedingBlurMs ?? null

  // Only escalate for a genuinely large block, or a medium block that dominates
  // the answer (mostly pasted, barely typed).
  const isLarge = largest >= LARGE_BLOCK
  const dominates = pastedShare >= 0.7
  if (!isLarge && !dominates) return null

  let confidence = isLarge ? 0.7 : 0.6
  let rationale = `A ${largest}-character block was pasted in one action${dominates ? `, making up ~${Math.round(pastedShare * 100)}% of the answer` : ''}.`
  if (blur != null && blur <= 5_000) {
    confidence = Math.min(0.9, confidence + 0.15)
    rationale += ` The paste followed leaving the interview window ${(blur / 1000).toFixed(0)}s earlier.`
  }

  return {
    type: 'paste_anomaly',
    confidence,
    rationale,
    meta: { largestPasteChars: largest, totalPastedChars: input.totalPastedChars ?? largest, pasteCount: input.pasteCount ?? 1, typedChars: typed, pastedShare: Math.round(pastedShare * 100) / 100, precedingBlurMs: blur },
  }
}
