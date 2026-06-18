// ── Post-interview fraud diarization analysis (Scribe v2 batch) ─────────────
// Pure analysis over ElevenLabs batch speech-to-text words (diarize=true). The
// candidate is whoever speaks the most; any OTHER speaker is a potential second
// voice (a coach/whisperer feeding answers). Flags are REVIEW-ONLY — never an
// auto-fail — so we bias toward surfacing a reviewable span over silence, but
// guard against ambient-noise false positives with minimum-span thresholds.

export interface ScribeBatchWord {
  text: string
  start?: number
  end?: number
  speaker_id?: string | null
  type?: string  // 'word' | 'spacing' | 'audio_event' ...
}

export interface SecondVoiceSegment {
  speakerId: string
  startSec: number
  endSec: number
  wordCount: number
  transcript: string
  confidence: number  // 0–1
}

export interface DiarizeOptions {
  // A non-primary span must have at least this many words AND this duration to
  // count — filters out one-off mis-attributions and ambient blips.
  minWords?: number       // default 3
  minDurationSec?: number // default 1.2
  maxGapSec?: number      // words within this gap are the same span (default 1.5)
}

const isWord = (w: ScribeBatchWord) => (w.type ?? 'word') === 'word' && !!w.text?.trim()

// Identify the primary (candidate) speaker = most spoken words.
export function primarySpeaker(words: ScribeBatchWord[]): string | null {
  const counts = new Map<string, number>()
  for (const w of words) {
    if (!isWord(w) || !w.speaker_id) continue
    counts.set(w.speaker_id, (counts.get(w.speaker_id) ?? 0) + 1)
  }
  let best: string | null = null; let bestN = -1
  for (const [id, n] of Array.from(counts.entries())) if (n > bestN) { best = id; bestN = n }
  return best
}

export function analyzeDiarization(words: ScribeBatchWord[], opts: DiarizeOptions = {}): SecondVoiceSegment[] {
  const minWords = opts.minWords ?? 3
  const minDur = opts.minDurationSec ?? 1.2
  const maxGap = opts.maxGapSec ?? 1.5

  const primary = primarySpeaker(words)
  if (!primary) return []
  const primaryId: string = primary

  // Group consecutive non-primary words into contiguous spans.
  const segments: SecondVoiceSegment[] = []
  let cur: { id: string; words: ScribeBatchWord[] } | null = null
  const flush = () => {
    if (!cur) return
    const ws = cur.words.filter(isWord)
    const start = ws[0]?.start ?? 0
    const end = ws[ws.length - 1]?.end ?? start
    const dur = Math.max(0, end - start)
    if (ws.length >= minWords && dur >= minDur) {
      // Confidence scales with how much was said (longer = more clearly a real voice).
      const confidence = Math.min(1, 0.5 + ws.length * 0.05 + dur * 0.1)
      segments.push({
        speakerId: cur.id,
        startSec: Number(start.toFixed(2)),
        endSec: Number(end.toFixed(2)),
        wordCount: ws.length,
        transcript: ws.map((w) => w.text.trim()).join(' ').slice(0, 280),
        confidence: Number(confidence.toFixed(2)),
      })
    }
    cur = null
  }

  let lastEnd = -Infinity
  for (const w of words) {
    if (!isWord(w)) continue
    const sid: string = w.speaker_id ?? primaryId
    const gap = (w.start ?? 0) - lastEnd
    if (sid === primaryId) { flush() }
    else {
      if (cur && (cur.id !== sid || gap > maxGap)) flush()
      if (!cur) cur = { id: sid, words: [] }
      cur.words.push(w)
    }
    lastEnd = w.end ?? w.start ?? lastEnd
  }
  flush()
  return segments
}
