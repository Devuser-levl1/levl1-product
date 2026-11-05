'use client'

import { WaveformVisualizer } from './WaveformVisualizer'
import { MorphingSphere }     from './MorphingSphere'
import type { InterviewPhase } from '@/store/appStore'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'

/* ── Status config ───────────────────────────────────────────── */
const STATUS: Partial<Record<string, { label: string; dot: string; color: string }>> = {
  listening:   { label: 'Listening…',            dot: '#7CC49B', color: '#7CC49B' },
  speaking:    { label: 'Speaking…',             dot: '#A5B4FC', color: '#A5B4FC' },
  intro:       { label: 'Speaking…',             dot: '#A5B4FC', color: '#A5B4FC' },
  closing:     { label: 'Wrapping up…',          dot: '#A5B4FC', color: '#A5B4FC' },
  processing:  { label: 'Thinking…',             dot: '#D9B26A', color: '#D9B26A' },
  questioning: { label: 'Waiting for response…', dot: '#71717A', color: '#A1A1AA' },
  waiting:     { label: 'Ready to begin',        dot: '#818CF8', color: '#A5B4FC' },
  warmup:      { label: 'Take your time…',       dot: '#71717A', color: '#A1A1AA' },
}
const FALLBACK = { label: 'Waiting for response…', dot: '#71717A', color: '#A1A1AA' }

function fmt(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60)
  const s = Math.max(0, secs) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ── Props ───────────────────────────────────────────────────── */
interface Props {
  phase:                 InterviewPhase
  isWarmingUp?:          boolean
  liveTranscriptLength?: number   // drives waveform amplitude
  timeRemaining?:        number   // shown in top-right corner
  candidateName?:        string
  positionTitle?:        string
  compact?:              boolean  // modest height (waveform-only box, no dominant block)
}

/* ═══════════════════════════════════════════════════════════════
   AIVisualizer
   - Waveform (Canvas) for listening / waiting / processing / questioning
   - Morphing Sphere (Three.js) for speaking / intro / closing
   - Crossfade 300 ms between states
   - Quiet dark stage panel (flat, hairline border) — matches the candidate video tile
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
  /* Which visualizer to show */
  const showSphere   = phase === 'speaking' || phase === 'intro' || phase === 'closing'
  const showWaveform = !showSphere

  /* Waveform amplitude: boosts when candidate is actively speaking */
  const audioLevel = (phase === 'listening' && liveTranscriptLength > 0) ? 0.65 : 0

  /* Sphere morph intensity */
  const sphereIntensity = showSphere ? 0.55 : 0.08

  /* Status indicator */
  const statusKey = isWarmingUp ? 'warmup' : phase
  const st        = STATUS[statusKey] ?? FALLBACK

  /* Timer colour */
  const timerColor =
    timeRemaining === undefined     ? '#A5B4FC'
    : timeRemaining <= 120          ? '#EE8E84'
    : timeRemaining <= 300          ? '#D9B26A'
    :                                 '#A5B4FC'

  return (
    <div style={{
      background:   '#111113',
      borderRadius: 8,
      border:       '1px solid #27272A',
      padding:      compact ? '12px 14px 12px' : '16px 16px 14px',
      display:      'flex',
      flexDirection: 'column',
      alignItems:   'center',
      gap:          12,
      boxShadow:    'none',
    }}>

      {/* ── Top row: Alex label + timer ─────────────────────── */}
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', letterSpacing: '0.01em' }}>
            {INTERVIEWER_NAME}
          </div>
          <div style={{ fontSize: 11, color: '#A1A1AA', fontWeight: 500, marginTop: 1 }}>
            AI Interviewer
          </div>
        </div>
        {timeRemaining !== undefined && (
          <div style={{
            fontSize:     13,
            fontWeight:   600,
            color:        timerColor,
            fontFamily:   'var(--lv-font-mono)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing:'0.05em',
            background:   'rgba(255,255,255,0.06)',
            padding:      '3px 8px',
            borderRadius: 6,
          }}>
            {fmt(timeRemaining)}
          </div>
        )}
      </div>

      {/* ── Candidate info (hidden in compact — already in the header) ─── */}
      {!compact && (candidateName || positionTitle) && (
        <div style={{ textAlign: 'center', width: '100%', marginTop: -4 }}>
          {candidateName && (
            <div style={{ fontSize: 11, fontWeight: 600, color: '#D4D4D8', letterSpacing: '0.02em' }}>
              {candidateName}
            </div>
          )}
          {positionTitle && (
            <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>{positionTitle}</div>
          )}
        </div>
      )}

      {/* ── Visualizer container (modest height in compact mode) ─────────── */}
      <div style={{ position: 'relative', width: '100%', height: compact ? 110 : 200 }}>

        {/* Waveform — listening / waiting / processing */}
        <div style={{
          position:      'absolute',
          inset:         0,
          display:       'flex',
          alignItems:    'center',
          opacity:       showWaveform ? 1 : 0,
          transition:    'opacity 0.30s ease',
          pointerEvents: showWaveform ? 'auto' : 'none',
        }}>
          <WaveformVisualizer audioLevel={audioLevel} height={compact ? 72 : 120} />
        </div>

        {/* Morphing Sphere — speaking / intro / closing */}
        <div style={{
          position:      'absolute',
          inset:         0,
          display:       'flex',
          alignItems:    'center',
          justifyContent:'center',
          opacity:       showSphere ? 1 : 0,
          transition:    'opacity 0.30s ease',
          pointerEvents: showSphere ? 'auto' : 'none',
        }}>
          <MorphingSphere intensity={sphereIntensity} />
        </div>
      </div>

      {/* ── Status indicator ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{
          width:        7,
          height:       7,
          borderRadius: '50%',
          background:   st.dot,
          display:      'inline-block',
          flexShrink:   0,
          animation:    'pulseDot 1.4s ease-in-out infinite',
        }} />
        <span style={{
          fontSize:      11,
          fontWeight:    600,
          color:         st.color,
          letterSpacing: '0.02em',
          whiteSpace:    'nowrap',
        }}>
          {st.label}
        </span>
      </div>
    </div>
  )
}
