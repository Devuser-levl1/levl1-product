import type { Prisma } from '@prisma/client'

// ── Candidate heartbeat contract (Screen-scoped) ───────────────────────────
// What the interview page pushes every few seconds so the recruiter Control
// Room can show live health without joining. Only signals the client already
// has (phase, question, CV face count, STT state, transcript) — no media.

export const HEARTBEAT_MS = 5000
export const TAIL_ENTRIES = 30

export interface HeartbeatTranscriptEntry { speaker: 'ai' | 'candidate'; text: string; timestamp: string }

export interface HeartbeatInput {
  phase?: string
  questionIndex?: number
  questionCount?: number
  questionText?: string
  camState?: 'starting' | 'on' | 'denied'
  faceCount?: number | null
  faceAbsentSince?: string | null
  multiFaceAt?: string | null
  sttMode?: 'scribe' | 'webspeech' | 'text' | 'none'
  micOk?: boolean
  sttWarning?: string | null
  lastSpeechAt?: string | null
  tabHidden?: boolean
  interim?: string
  // Full transcript — sent only when it grew (persisted to Interview.transcript
  // so playback has the complete, timestamped conversation).
  transcript?: HeartbeatTranscriptEntry[]
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const iso = (v: unknown) => (typeof v === 'string' && !isNaN(Date.parse(v)) ? new Date(v) : null)
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : undefined)

function cleanTranscript(raw: unknown): HeartbeatTranscriptEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.slice(-400).flatMap((e) => {
    if (!e || typeof e !== 'object') return []
    const o = e as Record<string, unknown>
    const speaker = o.speaker === 'ai' || o.speaker === 'candidate' ? o.speaker : null
    const text = str(o.text, 4000)
    const ts = iso(o.timestamp)
    return speaker && text && ts ? [{ speaker, text, timestamp: ts.toISOString() }] : []
  })
}

// Untrusted browser payload → Prisma upsert data for InterviewLiveState, plus
// the optional full transcript.
export function sanitizeHeartbeat(raw: unknown, now = new Date()) {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const transcript = cleanTranscript(o.transcript)
  const faceCount = o.faceCount === null ? null : int(o.faceCount)
  const sttMode = ['scribe', 'webspeech', 'text', 'none'].includes(o.sttMode as string) ? (o.sttMode as string) : undefined
  const camState = ['starting', 'on', 'denied'].includes(o.camState as string) ? (o.camState as string) : undefined

  const state = {
    lastBeatAt: now,
    phase: str(o.phase, 40),
    questionIndex: int(o.questionIndex),
    questionCount: int(o.questionCount),
    questionText: str(o.questionText, 2000),
    camState,
    faceCount,
    faceAbsentSince: iso(o.faceAbsentSince),
    multiFaceAt: iso(o.multiFaceAt),
    sttMode,
    micOk: typeof o.micOk === 'boolean' ? o.micOk : undefined,
    sttWarning: o.sttWarning === null ? null : str(o.sttWarning, 200),
    lastSpeechAt: iso(o.lastSpeechAt),
    tabHidden: typeof o.tabHidden === 'boolean' ? o.tabHidden : undefined,
    interim: str(o.interim, 600) ?? null,
    ...(transcript ? { transcriptTail: transcript.slice(-TAIL_ENTRIES) as unknown as Prisma.InputJsonValue } : {}),
  } satisfies Prisma.InterviewLiveStateUncheckedUpdateInput

  return { state, transcript }
}
