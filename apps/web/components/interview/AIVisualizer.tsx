'use client'

import { WaveformVisualizer } from './WaveformVisualizer'
import { MorphingSphere }     from './MorphingSphere'
import type { InterviewPhase } from '@/store/appStore'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'

/* ── Status config ───────────────────────────────────────────── */
const STATUS: Partial<Record<string, { label: string; dot: string; color: string }>> = {
  listening:   { label: 'Listening…',            dot: '#10B981', color: '#10B981' },
  speaking:    { label: 'Speaking…',             dot: '#A78BFA', color: '#A78BFA' },
  intro:       { label: 'Speaking…',             dot: '#A78BFA', color: '#A78BFA' },
  closing:     { label: 'Wrapping up…',          dot: '#A78BFA', color: '#A78BFA' },
  processing:  { label: 'Thinking…',             dot: '#F59E0B', color: '#F59E0B' },
  questioning: { label: 'Waiting for response…', dot: '#475569', color: '#64748B' },
  waiting:     { label: 'Ready to begin',        dot: '#4F46E5', color: '#6366F1' },
  warmup:      { label: 'Take your time…',       dot: '#64748B', color: '#94A3B8' },
}
const FALLBACK = { label: 'Waiting for response…', dot: '#475569', color: '#64748B' }

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
   - Dark card with purple glow
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
    timeRemaining === undefined     ? '#A78BFA'
    : timeRemaining <= 120          ? '#EF4444'
    : timeRemaining <= 300          ? '#F59E0B'
    :                                 '#A78BFA'

  return (
    <div style={{
      background:   '#0F0F1A',
      borderRadius: 18,
      border:       '1px solid rgba(124,58,237,0.28)',
      padding:      compact ? '12px 14px 12px' : '16px 16px 14px',
      display:      'flex',
      flexDirection: 'column',
      alignItems:   'center',
      gap:          12,
      boxShadow:    '0 0 56px rgba(124,58,237,0.20), 0 0 0 1px rgba(255,255,255,0.04) inset',
    }}>

      {/* ── Top row: Alex label + timer ─────────────────────── */}
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', letterSpacing: '0.01em' }}>
            {INTERVIEWER_NAME}
          </div>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 500, marginTop: 1 }}>
            AI Interviewer
          </div>
        </div>
        {timeRemaining !== undefined && (
          <div style={{
            fontSize:     13,
            fontWeight:   800,
            color:        timerColor,
            fontFamily:   'monospace',
            letterSpacing:'0.05em',
            background:   'rgba(124,58,237,0.12)',
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
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.02em' }}>
              {candidateName}
            </div>
          )}
          {positionTitle && (
            <div style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>{positionTitle}</div>
          )}
        </div>
      )}

      {/* ── Visualizer container (modest height in compact mode) ─────────── */}
      <div style={{ position: 'relative', width: '100%', height: compact ? 110 : 200 }}>

        {/* Soft purple radial glow behind both visualizers */}
        <div style={{
          position:      'absolute',
          top: '50%', left: '50%',
          transform:     'translate(-50%, -50%)',
          width:         '160%',
          height:        '160%',
          background:    'radial-gradient(ellipse at center, rgba(124,58,237,0.24) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)',
          pointerEvents: 'none',
          borderRadius:  '50%',
        }} />

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
