import { HIGH_CONFIDENCE_TYPES, INTEGRITY_LABELS, IntegrityEventType, isIntegrityEventType } from '../integrity/events'

// ── Recruiter Control Room — live health derivation (Screen-scoped) ────────
// PURE aggregation of signals the interview already captures: the candidate
// heartbeat (InterviewLiveState) + the integrity event store. No detection
// happens here. Output is exception-first: a severity, a short list of human
// reasons ("tell me where to look"), and a single "real human present" verdict.
//
// Like the rest of the integrity layer, these states route to HUMAN attention.
// They never score, fail, or end an interview.

export type HealthLevel = 'ok' | 'watch' | 'alert'
export type HumanPresence = 'present' | 'unverified' | 'anomaly'

export interface LiveSnapshot {
  lastBeatAt: Date | string
  phase: string | null
  phaseSince: Date | string | null
  camState: string | null
  faceCount: number | null
  faceAbsentSince: Date | string | null
  multiFaceAt: Date | string | null
  sttMode: string | null
  micOk: boolean
  sttWarning: string | null
  lastSpeechAt: Date | string | null
  tabHidden: boolean
}

export interface RecentFlag { type: string; count: number }

export interface HealthInput {
  startedAt: Date | string | null
  live: LiveSnapshot | null
  recentFlags: RecentFlag[]   // integrity events in the RECENT window, grouped by type
  totalFlags: number          // high-confidence events across the whole session
  now?: number
}

export interface HealthReason { code: string; label: string; level: HealthLevel }

export interface Health {
  level: HealthLevel
  severity: number            // sort key — higher = look here first
  presence: HumanPresence
  presenceLabel: string
  reasons: HealthReason[]
  connection: 'live' | 'lagging' | 'lost' | 'waiting'
  face: 'single' | 'none' | 'multiple' | 'camera_off' | 'unknown'
  audio: 'speaking' | 'silent' | 'ai_turn' | 'no_audio' | 'text_mode' | 'unknown'
}

// Thresholds (ms). Conservative — a tile goes red only on a clear, sustained problem.
export const RECENT_WINDOW_MS = 2 * 60_000
const BEAT_LAG_MS = 15_000
const BEAT_LOST_MS = 35_000
const NO_HEARTBEAT_GRACE_MS = 60_000
const FACE_ABSENT_ALERT_MS = 8_000
const MULTI_FACE_RECENT_MS = 30_000
const SPEECH_RECENT_MS = 4_000
const SILENT_WATCH_MS = 45_000
const PRESENCE_SPEECH_MS = 3 * 60_000
const STALL_MS = 3 * 60_000
const FLAG_BURST_ALERT = 4

// Phases where the candidate is expected to be the one talking.
const CANDIDATE_TURN = new Set(['listening'])
// Phases where a long dwell means the session is stuck rather than just quiet.
const STALL_PHASES = new Set(['processing', 'speaking', 'questioning'])

const t = (v: Date | string | null | undefined) => (v ? new Date(v).getTime() : null)

export function deriveHealth(input: HealthInput): Health {
  const now = input.now ?? Date.now()
  const reasons: HealthReason[] = []
  const add = (code: string, label: string, level: HealthLevel) => reasons.push({ code, label, level })
  const live = input.live

  // ── Connection ─────────────────────────────────────────────────────────
  let connection: Health['connection'] = 'waiting'
  if (live) {
    const age = now - (t(live.lastBeatAt) ?? 0)
    connection = age > BEAT_LOST_MS ? 'lost' : age > BEAT_LAG_MS ? 'lagging' : 'live'
    if (connection === 'lost') add('dropped', `Candidate dropped — no signal for ${fmtAgo(age)}`, 'alert')
    else if (connection === 'lagging') add('lagging', 'Connection lagging', 'watch')
  } else {
    const since = now - (t(input.startedAt) ?? now)
    if (since > NO_HEARTBEAT_GRACE_MS) add('no_signal', 'No live signal from candidate browser', 'alert')
  }
  const fresh = connection === 'live' || connection === 'lagging'

  // ── Face / people in frame ─────────────────────────────────────────────
  let face: Health['face'] = 'unknown'
  if (live && fresh) {
    const multiAt = t(live.multiFaceAt)
    if ((live.faceCount ?? 0) > 1 || (multiAt !== null && now - multiAt < MULTI_FACE_RECENT_MS)) {
      face = 'multiple'
      add('second_person', 'Second person in frame', 'alert')
    } else if (live.camState === 'denied') {
      face = 'camera_off'
      add('camera_off', 'Camera off', 'watch')
    } else if (live.faceCount === 0) {
      face = 'none'
      const absent = now - (t(live.faceAbsentSince) ?? now)
      if (absent >= FACE_ABSENT_ALERT_MS) add('no_face', `No face for ${fmtAgo(absent)}`, 'alert')
      else add('no_face_brief', 'Face momentarily not visible', 'watch')
    } else if (live.faceCount === 1) {
      face = 'single'
    }
  }

  // ── Audio / speaking ───────────────────────────────────────────────────
  let audio: Health['audio'] = 'unknown'
  if (live && fresh) {
    const lastSpeech = t(live.lastSpeechAt)
    const phaseSince = t(live.phaseSince)
    if (!live.micOk || live.sttMode === 'none') {
      audio = 'no_audio'
      add('no_audio', 'Microphone / transcription not working', 'alert')
    } else if (live.sttMode === 'text') {
      audio = 'text_mode'
      add('text_mode', 'Candidate switched to typing (no audio)', 'watch')
    } else if (live.sttWarning) {
      audio = 'no_audio'
      add('stt_warning', 'Candidate audio not reaching the interviewer', 'watch')
    } else if (lastSpeech !== null && now - lastSpeech < SPEECH_RECENT_MS) {
      audio = 'speaking'
    } else if (live.phase && CANDIDATE_TURN.has(live.phase)) {
      audio = 'silent'
      const quiet = now - Math.max(lastSpeech ?? 0, phaseSince ?? 0)
      if (quiet > SILENT_WATCH_MS) add('silent', `Candidate silent ${fmtAgo(quiet)}`, 'watch')
    } else {
      audio = 'ai_turn'
    }

    if (live.tabHidden) add('tab_hidden', 'Interview tab is in the background', 'watch')

    // Stalled: stuck in a non-candidate phase long past normal.
    if (live.phase && STALL_PHASES.has(live.phase) && phaseSince !== null && now - phaseSince > STALL_MS) {
      add('stalled', `Session stalled in "${live.phase}" for ${fmtAgo(now - phaseSince)}`, 'alert')
    }
  }

  // ── Integrity flags (existing store) ───────────────────────────────────
  let recentHigh = 0
  for (const f of input.recentFlags) {
    if (isIntegrityEventType(f.type) && HIGH_CONFIDENCE_TYPES.has(f.type)) recentHigh += f.count
  }
  if (recentHigh >= FLAG_BURST_ALERT) add('flag_burst', `${recentHigh} integrity flags in the last 2 min`, 'alert')
  else if (recentHigh > 0) {
    const top = [...input.recentFlags].sort((a, b) => b.count - a.count)[0]
    const label = isIntegrityEventType(top.type) ? INTEGRITY_LABELS[top.type as IntegrityEventType] : top.type
    add('flag_recent', `Recent flag: ${label}${top.count > 1 ? ` ×${top.count}` : ''}`, 'watch')
  }

  // ── Real human present? (the core ask) ─────────────────────────────────
  // present    = live + exactly one face + spoke recently + no second person
  // anomaly    = no face (sustained) / second person / dropped / no audio
  // unverified = camera off, CV unavailable, or hasn't spoken yet
  const lastSpeech = live ? t(live.lastSpeechAt) : null
  const spokeRecently = lastSpeech !== null && now - lastSpeech < PRESENCE_SPEECH_MS
  const anomalyCodes = new Set(['dropped', 'no_signal', 'second_person', 'no_face', 'no_audio'])
  let presence: HumanPresence
  let presenceLabel: string
  if (reasons.some((r) => anomalyCodes.has(r.code))) {
    presence = 'anomaly'
    presenceLabel = reasons.find((r) => anomalyCodes.has(r.code))!.label
  } else if (face === 'single' && spokeRecently) {
    presence = 'present'
    presenceLabel = 'Real human present — one face, speaking'
  } else {
    presence = 'unverified'
    presenceLabel = face === 'camera_off' ? 'Unverified — camera off'
      : face === 'single' ? 'Face present — not heard yet'
      : !live ? 'Waiting for candidate'
      : 'Unverified — face detection unavailable'
  }

  const level: HealthLevel = reasons.some((r) => r.level === 'alert') ? 'alert'
    : reasons.some((r) => r.level === 'watch') ? 'watch' : 'ok'
  const severity = reasons.reduce((s, r) => s + (r.level === 'alert' ? 100 : r.level === 'watch' ? 10 : 0), 0)
    + Math.min(input.totalFlags, 9)
  // Alerts first within each list.
  reasons.sort((a, b) => rank(b.level) - rank(a.level))

  return { level, severity, presence, presenceLabel, reasons, connection, face, audio }
}

function rank(l: HealthLevel) { return l === 'alert' ? 2 : l === 'watch' ? 1 : 0 }

export function fmtAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ${s % 60 ? `${s % 60}s` : ''}`.trim() : `${Math.floor(m / 60)}h ${m % 60}m`
}
