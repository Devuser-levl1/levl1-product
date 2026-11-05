'use client'

import { VoiceOrb } from './VoiceOrb'
import type { InterviewPhase } from '@/store/appStore'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'

/* ── Status config (design-system tokens) ───────────────────── */
const STATUS: Partial<Record<string, { label: string; color: string }>> = {
  listening:   { label: 'Listening…',            color: 'var(--lv-success)' },
  speaking:    { label: 'Speaking…',             color: 'var(--lv-brand)' },
  intro:       { label: 'Speaking…',             color: 'var(--lv-brand)' },
  closing:     { label: 'Wrapping up…',          color: 'var(--lv-brand)' },
  processing:  { label: 'Thinking…',             color: 'var(--lv-warning)' },
  questioning: { label: 'Waiting for response…', color: 'var(--lv-text-muted)' },
  waiting:     { label: 'Ready to begin',        color: 'var(--lv-text-muted)' },
  warmup:      { label: 'Take your time…',       color: 'var(--lv-text-muted)' },
}
const FALLBACK = { label: 'Waiting for response…', color: 'var(--lv-text-muted)' }

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
        <VoiceOrb energy={energy} size={compact ? 120 : 190} label={`${INTERVIEWER_NAME} — ${st.label}`} />
      </div>

      {/* ── Status ── */}
      <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span aria-hidden="true" style={{
          width: 6, height: 6, borderRadius: '50%', background: st.color, flexShrink: 0,
          animation: 'pulseDot 1.4s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
      </div>
    </div>
  )
}
