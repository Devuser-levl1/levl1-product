'use client'

import { Mic, Volume2, Loader2, Hourglass } from 'lucide-react'
import { VoiceOrb } from './VoiceOrb'
import type { InterviewPhase } from '@/store/appStore'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'

/* ── Status config (design-system tokens) ───────────────────── */
// Three distinct speaker states (plus quiet idle ones), each with its own
// icon + tone so "who has the floor" is obvious at a glance.
type Kind = 'speaking' | 'listening' | 'thinking' | 'idle'
const STATUS: Partial<Record<string, { label: string; kind: Kind }>> = {
  listening:   { label: 'Listening',             kind: 'listening' },
  speaking:    { label: 'Speaking',              kind: 'speaking' },
  intro:       { label: 'Speaking',              kind: 'speaking' },
  closing:     { label: 'Wrapping up',           kind: 'speaking' },
  processing:  { label: 'Thinking',              kind: 'thinking' },
  questioning: { label: 'Waiting for your answer', kind: 'idle' },
  waiting:     { label: 'Ready to begin',        kind: 'idle' },
  warmup:      { label: 'Take your time',        kind: 'listening' },
}
const FALLBACK = { label: 'Waiting for your answer', kind: 'idle' as Kind }
const TONE: Record<Kind, { fg: string; bg: string; border: string }> = {
  speaking:  { fg: 'var(--lv-brand-text, var(--lv-brand))', bg: 'var(--lv-brand-soft)',   border: 'var(--lv-brand-soft-border, var(--lv-border))' },
  listening: { fg: 'var(--lv-success)',                     bg: 'var(--lv-success-soft)', border: 'var(--lv-success-border, var(--lv-border))' },
  thinking:  { fg: 'var(--lv-warning)',                     bg: 'var(--lv-warning-soft, var(--lv-surface-sunken))', border: 'var(--lv-warning-border, var(--lv-border))' },
  idle:      { fg: 'var(--lv-text-muted)',                  bg: 'var(--lv-surface-sunken)', border: 'var(--lv-border)' },
}
function StateIcon({ kind }: { kind: Kind }) {
  if (kind === 'speaking')  return <Volume2 size={13} aria-hidden="true" />
  if (kind === 'listening') return <Mic size={13} aria-hidden="true" />
  if (kind === 'thinking')  return <Loader2 size={13} aria-hidden="true" style={{ animation: 'spin 1.1s linear infinite' }} />
  return <Hourglass size={13} aria-hidden="true" />
}

function fmt(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60)
  const s = Math.max(0, secs) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ── Props ───────────────────────────────────────────────────── */
interface Props {
  phase:                 InterviewPhase
  isWarmingUp?:          boolean
  liveTranscriptLength?: number   // > 0 while the candidate is speaking → livelier orb
  timeRemaining?:        number   // shown in top-right corner
  candidateName?:        string
  positionTitle?:        string
  compact?:              boolean  // modest height
}

/* ═══════════════════════════════════════════════════════════════
   AIVisualizer — white panel with the interviewer's VoiceOrb.
   Orb energy by phase: speaking > thinking > listening (rises while the
   candidate talks) > idle. Presentation only; props unchanged.
═══════════════════════════════════════════════════════════════ */
export function AIVisualizer({
  phase,
  isWarmingUp          = false,
  liveTranscriptLength = 0,
  timeRemaining,
  candidateName,
  positionTitle,
  compact = false,
}: Props) {
  const speaking = phase === 'speaking' || phase === 'intro' || phase === 'closing'
  const energy =
    speaking                  ? 0.9
    : phase === 'processing'  ? 0.45
    : phase === 'listening'   ? (liveTranscriptLength > 0 ? 0.6 : 0.25)
    :                           0.12

  const st = STATUS[isWarmingUp ? 'warmup' : phase] ?? FALLBACK

  const timerColor =
    timeRemaining === undefined ? 'var(--lv-text-muted)'
    : timeRemaining <= 120      ? 'var(--lv-danger)'
    : timeRemaining <= 300      ? 'var(--lv-warning)'
    :                             'var(--lv-text-muted)'

  return (
    <div style={{
      background:    'var(--lv-surface)',
      borderRadius:  8,
      border:        '1px solid var(--lv-border)',
      padding:       compact ? '12px 14px' : '16px 16px 14px',
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           compact ? 8 : 12,
    }}>
      {/* ── Top row: interviewer + timer ── */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>{INTERVIEWER_NAME}</div>
          <div style={{ fontSize: 11, color: 'var(--lv-text-muted)', marginTop: 1 }}>AI Interviewer</div>
        </div>
        {timeRemaining !== undefined && (
          <div style={{
            fontSize: 13, fontWeight: 600, color: timerColor,
            fontFamily: 'var(--lv-font-mono)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em',
            background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)',
            padding: '2px 8px', borderRadius: 6,
          }}>
            {fmt(timeRemaining)}
          </div>
        )}
      </div>

      {/* ── Candidate info (hidden in compact — already in the header) ── */}
      {!compact && (candidateName || positionTitle) && (
        <div style={{ textAlign: 'center', width: '100%', marginTop: -4 }}>
          {candidateName && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)' }}>{candidateName}</div>}
          {positionTitle && <div style={{ fontSize: 11, color: 'var(--lv-text-muted)', marginTop: 1 }}>{positionTitle}</div>}
        </div>
      )}

      {/* ── Voice orb ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <VoiceOrb energy={energy} size={compact ? 150 : 190} label={`${INTERVIEWER_NAME} — ${st.label}`} />
      </div>

      {/* ── Speaker state ── */}
      <div aria-live="polite" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
        background: TONE[st.kind].bg, border: `1px solid ${TONE[st.kind].border}`, color: TONE[st.kind].fg,
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'background 0.2s, color 0.2s',
      }}>
        <StateIcon kind={st.kind} />
        {st.label}
      </div>
    </div>
  )
}
