'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Pause, Play, Flag, ShieldAlert, ShieldCheck, Loader2, Headphones, SkipBack, SkipForward } from 'lucide-react'
import { HIGH_CONFIDENCE_TYPES, IntegrityEventType } from '@/lib/screen/integrity/events'

// ── Session playback (Screen) ──────────────────────────────────────────────
// Recorded audio + full transcript + integrity-flag timeline on ONE clock: the
// recording's wall-clock start. Click a flag marker / transcript line / event
// to jump there. Agency-gated by the API; demo runs are never retained.

const C = {
  brand: '#4F46E5', brandSoft: '#EEF2FF', ink: '#0F172A', body: '#475569', muted: '#94A3B8',
  line: '#E2E8F0', surface: '#FFFFFF', bg: '#F8FAFC', red: '#DC2626', redSoft: '#FEF2F2', amber: '#D97706', amberSoft: '#FFFBEB', green: '#059669',
}

interface TxEntry { speaker: 'ai' | 'candidate'; text: string; timestamp: string }
interface Ev { id: string; type: string; label: string; occurredAt: string; durationMs: number | null; confidence: number; detail: string | null; meta: Record<string, unknown> | null }
interface PlaybackData {
  interview: { id: string; status: string; startedAt: string | null; completedAt: string | null; terminationReason: string | null; candidate: { name: string; email: string }; position: { title: string; company: string } }
  recording: { mimeType: string; sizeBytes: number; startedAt: string; durationMs: number | null; expiresAt: string } | null
  transcript: TxEntry[]
  integrity: { reviewStatus: 'CLEAN' | 'FLAGGED_FOR_REVIEW'; totalFlags: number; events: Ev[] }
}

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function PlaybackPage() {
  const { interviewId } = useParams() as { interviewId: string }
  const [data, setData] = useState<PlaybackData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [mediaDur, setMediaDur] = useState<number | null>(null)
  const fixingDurRef = useRef(false)
  const activeRef = useRef<HTMLDivElement>(null)
  const [follow, setFollow] = useState(true)

  useEffect(() => {
    fetch(`/api/control-room/${interviewId}/playback`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) throw new Error('Sign in to view this session.')
        if (!r.ok) throw new Error('Session not found.')
        setData(await r.json())
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [interviewId])

  // ── One clock: seconds since the recording started ──
  const base = useMemo(() => {
    const iso = data?.recording?.startedAt ?? data?.interview.startedAt ?? data?.transcript[0]?.timestamp
    return iso ? new Date(iso).getTime() : 0
  }, [data])
  const at = useCallback((iso: string) => Math.max(0, (new Date(iso).getTime() - base) / 1000), [base])

  const transcript = useMemo(() => (data?.transcript ?? []).map((e) => ({ ...e, sec: at(e.timestamp) })), [data, at])
  const events = useMemo(() => (data?.integrity.events ?? []).map((e) => {
    // Post-interview diarization events carry their exact offset into this same recording.
    const startSec = typeof e.meta?.startSec === 'number' ? (e.meta.startSec as number) : null
    return { ...e, sec: startSec ?? at(e.occurredAt), high: HIGH_CONFIDENCE_TYPES.has(e.type as IntegrityEventType) || e.type === 'second_voice' }
  }), [data, at])

  const duration = useMemo(() => {
    if (mediaDur && isFinite(mediaDur)) return mediaDur
    if (data?.recording?.durationMs) return data.recording.durationMs / 1000
    const ends = [...transcript.map((e) => e.sec), ...events.map((e) => e.sec)]
    const endIso = data?.interview.completedAt
    return Math.max(endIso ? at(endIso) : 0, ...ends, 1)
  }, [mediaDur, data, transcript, events, at])

  const hasAudio = !!data?.recording
  const activeIdx = useMemo(() => {
    let idx = -1
    for (let i = 0; i < transcript.length; i++) if (transcript[i].sec <= t + 0.25) idx = i
    return idx
  }, [transcript, t])

  useEffect(() => {
    if (follow && playing) activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIdx, follow, playing])

  const seek = useCallback((sec: number) => {
    const s = Math.max(0, Math.min(sec, duration))
    setT(s)
    const a = audioRef.current
    if (a && hasAudio) { a.currentTime = s; if (a.paused) void a.play().catch(() => {}) }
  }, [duration, hasAudio])

  // MediaRecorder WebM has no duration header — force the browser to compute it
  // so seeking works (known Chrome workaround).
  const onLoadedMeta = () => {
    const a = audioRef.current
    if (!a) return
    if (!isFinite(a.duration)) { fixingDurRef.current = true; a.currentTime = 1e101 }
    else setMediaDur(a.duration)
  }
  const onDurationChange = () => {
    const a = audioRef.current
    if (!a || !isFinite(a.duration)) return
    setMediaDur(a.duration)
    if (fixingDurRef.current) { fixingDurRef.current = false; a.currentTime = 0 }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); toggle() }
      if (e.key === 'ArrowRight') seek(t + 5)
      if (e.key === 'ArrowLeft') seek(t - 5)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) void a.play().catch(() => {}); else a.pause()
  }

  const nextFlag = (dir: 1 | -1) => {
    const list = events.filter((e) => e.high).map((e) => e.sec).sort((x, y) => x - y)
    const target = dir === 1 ? list.find((s) => s > t + 0.5) : [...list].reverse().find((s) => s < t - 1.5)
    if (target !== undefined) seek(Math.max(0, target - 2))
  }

  if (error) return <Shell><div style={{ padding: 60, textAlign: 'center', color: C.body }}>{error}</div></Shell>
  if (!data) return <Shell><div style={{ padding: 60, display: 'flex', gap: 8, justifyContent: 'center', color: C.muted }}><Loader2 size={16} className="animate-spin" /> Loading session…</div></Shell>

  const flagged = data.integrity.reviewStatus === 'FLAGGED_FOR_REVIEW'

  return (
    <Shell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Session playback</div>
          <h1 style={{ margin: '4px 0 2px', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }}>{data.interview.candidate.name}</h1>
          <div style={{ fontSize: 13.5, color: C.body }}>
            {data.interview.position.title} · {data.interview.position.company}
            {data.interview.startedAt && ` · ${new Date(data.interview.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: flagged ? C.amberSoft : '#ECFDF5', border: `1px solid ${flagged ? '#FDE68A' : '#A7F3D0'}` }}>
          {flagged ? <ShieldAlert size={18} color={C.amber} /> : <ShieldCheck size={18} color={C.green} />}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: flagged ? C.amber : C.green }}>{flagged ? 'Flagged for human review' : 'No integrity concerns'}</div>
            <div style={{ fontSize: 11.5, color: C.body }}>{events.length} event{events.length === 1 ? '' : 's'} · never an auto-fail</div>
          </div>
        </div>
        <a href={`/report/${data.interview.id}`} style={{ alignSelf: 'center', fontSize: 13, fontWeight: 600, color: C.brand, textDecoration: 'none' }}>Open report →</a>
      </div>

      {/* Player */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 18, marginBottom: 18, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
        {hasAudio ? (
          <audio ref={audioRef} src={`/api/control-room/${interviewId}/audio`} preload="metadata"
            onLoadedMetadata={onLoadedMeta} onDurationChange={onDurationChange}
            onTimeUpdate={(e) => { if (!fixingDurRef.current) setT(e.currentTarget.currentTime) }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.body, background: C.bg, borderRadius: 10, padding: '8px 12px', marginBottom: 14 }}>
            <Headphones size={14} color={C.muted} /> No recording was retained for this session — the transcript and flag timeline are still navigable.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconBtn label="Previous flag" onClick={() => nextFlag(-1)} disabled={!hasAudio}><SkipBack size={16} /></IconBtn>
          <button onClick={toggle} disabled={!hasAudio} aria-label={playing ? 'Pause' : 'Play'}
            style={{ width: 46, height: 46, borderRadius: 23, border: 'none', background: hasAudio ? C.brand : C.line, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hasAudio ? 'pointer' : 'not-allowed', boxShadow: hasAudio ? '0 6px 16px rgba(79,70,229,0.3)' : 'none', flexShrink: 0 }}>
            {playing ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" style={{ marginLeft: 2 }} />}
          </button>
          <IconBtn label="Next flag" onClick={() => nextFlag(1)} disabled={!hasAudio}><SkipForward size={16} /></IconBtn>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontVariantNumeric: 'tabular-nums', minWidth: 92 }}>{fmt(t)} / {fmt(duration)}</span>

          {/* Scrubber + flag markers */}
          <div style={{ flex: 1, position: 'relative', height: 40 }}>
            <div onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * duration) }}
              style={{ position: 'absolute', left: 0, right: 0, top: 22, height: 6, borderRadius: 3, background: C.line, cursor: 'pointer' }}>
              <div style={{ width: `${Math.min(100, (t / duration) * 100)}%`, height: '100%', borderRadius: 3, background: C.brand }} />
            </div>
            <div style={{ position: 'absolute', top: 16, left: `calc(${Math.min(100, (t / duration) * 100)}% - 9px)`, width: 18, height: 18, borderRadius: 9, background: '#fff', border: `3px solid ${C.brand}`, boxShadow: '0 2px 6px rgba(15,23,42,0.2)', pointerEvents: 'none' }} />
            {events.map((e) => (
              <button key={e.id} onClick={() => seek(Math.max(0, e.sec - 2))} title={`${fmt(e.sec)} · ${e.label}`} aria-label={`Jump to ${e.label} at ${fmt(e.sec)}`}
                style={{ position: 'absolute', top: 0, left: `calc(${Math.min(100, (e.sec / duration) * 100)}% - 5px)`, width: 10, height: 18, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                <span style={{ display: 'block', width: 3, height: 16, margin: '0 auto', borderRadius: 2, background: e.high ? C.red : C.amber }} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11.5, color: C.muted, paddingLeft: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 3, height: 10, background: C.red, borderRadius: 2 }} /> High-confidence flag</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 3, height: 10, background: C.amber, borderRadius: 2 }} /> Other signal</span>
          <span>Space play/pause · ←/→ 5s</span>
          {hasAudio && <span style={{ marginLeft: 'auto' }}>Audio recording · retained until {new Date(data.recording!.expiresAt).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Transcript + flag timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        <Panel title="Transcript" right={
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.body, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> Follow playback
          </label>}>
          {transcript.length === 0 ? <Empty>No transcript was captured for this session.</Empty> : (
            <div style={{ maxHeight: '62vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
              {transcript.map((e, i) => {
                const active = i === activeIdx
                const nearFlag = events.some((ev) => ev.high && ev.sec >= e.sec && (i + 1 >= transcript.length || ev.sec < transcript[i + 1].sec))
                return (
                  <div key={i} ref={active ? activeRef : undefined} onClick={() => seek(e.sec)}
                    style={{ display: 'flex', gap: 12, padding: '8px 10px', borderRadius: 10, cursor: hasAudio ? 'pointer' : 'default', background: active ? C.brandSoft : 'transparent', borderLeft: `3px solid ${active ? C.brand : nearFlag ? C.red : 'transparent'}` }}>
                    <span style={{ fontSize: 11.5, color: C.muted, fontVariantNumeric: 'tabular-nums', minWidth: 38, paddingTop: 2 }}>{fmt(e.sec)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: e.speaker === 'ai' ? C.brand : C.ink, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{e.speaker === 'ai' ? 'Interviewer' : 'Candidate'}</div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: C.ink }}>{e.text}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        <Panel title={`Integrity timeline (${events.length})`}>
          {events.length === 0 ? <Empty>No integrity events were recorded.</Empty> : (
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '62vh', overflowY: 'auto' }}>
              {[...events].sort((a, b) => a.sec - b.sec).map((e) => (
                <li key={e.id}>
                  <button onClick={() => seek(Math.max(0, e.sec - 2))} disabled={!hasAudio}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 10, border: 'none', background: Math.abs(e.sec - t) < 3 ? C.redSoft : 'transparent', cursor: hasAudio ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                    <Flag size={14} color={e.high ? C.red : C.amber} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: e.high ? C.red : C.ink }}>{e.label}</span>
                        <span style={{ fontSize: 11.5, color: C.brand, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(e.sec)}</span>
                      </div>
                      {e.detail && <div style={{ fontSize: 12, color: C.body, lineHeight: 1.45, marginTop: 2 }}>{e.detail}</div>}
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Confidence {Math.round(e.confidence * 100)}%</div>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <p style={{ margin: '10px 4px 0', fontSize: 11.5, color: C.muted }}>Flags route to human review — they never affect the competency score.</p>
        </Panel>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 32px 48px' }}>
        <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.body, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to dashboard
        </a>
        {children}
      </div>
    </div>
  )
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}{right}
      </div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: C.muted, padding: '12px 4px' }}>{children}</div>
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label}
      style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface, color: disabled ? C.muted : C.body, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
      {children}
    </button>
  )
}
