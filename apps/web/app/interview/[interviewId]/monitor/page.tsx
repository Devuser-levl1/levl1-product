'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import {
  Radio, Clock, CheckCircle2, AlertCircle, Zap,
  Code2, PenLine, MessageSquare, X, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmt(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60)
  const s = Math.max(0, secs) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function elapsed(startedAt: string) {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
}

const SECTION_COLOR: Record<string, string> = {
  technical:  '#0EA5E9',
  behavioral: '#10B981',
  scenario:   '#8B5CF6',
  eq:         '#F59E0B',
  whiteboard: '#EC4899',
}

/* ════════════════════════════════════════════════════════════════ */
export default function MonitorPage() {
  const params      = useParams()
  const router      = useRouter()
  const interviewId = params.interviewId as string

  const { interviews, candidates, positions, activeSession, updateInterview } = useAppStore()

  const interview = interviews.find((i) => i.id === interviewId)
  const candidate = interview ? candidates.find((c) => c.id === interview.candidateId) : null
  const position  = interview ? positions.find((p) => p.id === interview.positionId) : null

  const [elapsedSecs, setElapsedSecs]   = useState(0)
  const [showMessage, setShowMessage]   = useState(false)
  const [messageText, setMessageText]   = useState('')
  const transcriptRef = useRef<HTMLDivElement>(null)

  /* ── Elapsed counter ────────────────────────────────────────── */
  useEffect(() => {
    const iv = setInterval(() => {
      if (activeSession?.startedAt) {
        setElapsedSecs(elapsed(activeSession.startedAt))
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [activeSession?.startedAt])

  /* ── Auto-scroll transcript ─────────────────────────────────── */
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [activeSession?.transcript?.length])

  /* ── End interview (recruiter side) ─────────────────────────── */
  const handleEndInterview = () => {
    if (!interview) return
    updateInterview(interview.id, { status: 'completed' })
    toast.success('Interview ended by recruiter.')
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  /* ── Send message to candidate ──────────────────────────────── */
  const handleSendMessage = () => {
    if (!messageText.trim()) return
    // In a real app this would push to a shared state visible to candidate
    toast.success(`Message shown to candidate: "${messageText}"`)
    setMessageText('')
    setShowMessage(false)
  }

  /* ── No session / no interview ──────────────────────────────── */
  if (!interview || !candidate || !position) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F2147' }}>
        <div style={{ textAlign: 'center', color: '#94A3B8' }}>
          <AlertCircle size={40} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Interview not found</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>ID: {interviewId}</div>
        </div>
      </div>
    )
  }

  const session   = activeSession?.interviewId === interviewId ? activeSession : null
  const responses = session?.questionResponses ?? []
  const txEntries = session?.transcript ?? []
  const score     = session?.runningScore ?? 0
  const phase     = session?.phase ?? 'waiting'

  const phaseColor =
    phase === 'listening'   ? '#10B981'
    : phase === 'speaking'  ? '#0EA5E9'
    : phase === 'processing'? '#8B5CF6'
    : phase === 'completed' ? '#059669'
    : '#94A3B8'

  const phaseLabel =
    phase === 'waiting'    ? 'Waiting'
    : phase === 'intro'    ? 'Intro'
    : phase === 'questioning' ? 'AI Questioning'
    : phase === 'listening'   ? 'Candidate Speaking'
    : phase === 'processing'  ? 'Evaluating'
    : phase === 'speaking'    ? 'AI Speaking'
    : phase === 'closing'     ? 'Closing'
    : phase === 'completed'   ? 'Completed'
    : phase

  /* ── Duration calc ────────────────────────────────────────── */
  const totalDuration = (position.interviewDuration ?? 30) * 60
  const timeRemaining = session ? Math.max(0, totalDuration - elapsedSecs) : 0

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0F2147', color: '#fff', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ── */}
      <header style={{
        padding: '0 28px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0B1A35', borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Radio size={14} color="#DC2626" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', letterSpacing: '0.08em' }}>LIVE MONITOR</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>
            {candidate.name} · {position.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color="#94A3B8" />
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: timeRemaining <= 120 ? '#EF4444' : timeRemaining <= 300 ? '#F59E0B' : '#94A3B8' }}>
              {session ? `${fmt(elapsedSecs)} elapsed · ${fmt(timeRemaining)} left` : '—'}
            </span>
          </div>

          {/* Candidate link */}
          <a
            href={`/interview/${interviewId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#0EA5E9', textDecoration: 'none' }}
          >
            <ExternalLink size={12} /> Candidate View
          </a>

          <button
            onClick={() => setShowMessage(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: '#E2E8F0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <MessageSquare size={13} /> Message
          </button>

          <button
            onClick={handleEndInterview}
            style={{
              padding: '6px 14px', borderRadius: 7,
              border: '1px solid rgba(239,68,68,0.25)',
              background: 'rgba(239,68,68,0.15)', color: '#EF4444',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            End Interview
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', overflow: 'hidden' }}>

        {/* LEFT: Live transcript ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Live Transcript
            </span>
            {txEntries.length > 0 && (
              <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{txEntries.length} entries</span>
            )}
          </div>

          <div
            ref={transcriptRef}
            style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {txEntries.length === 0 && !session && (
              <div style={{ textAlign: 'center', paddingTop: 60, color: '#334155' }}>
                <Radio size={28} style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Waiting for interview to start</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  Candidate must open{' '}
                  <a href={`/interview/${interviewId}`} target="_blank" rel="noopener noreferrer"
                     style={{ color: '#0EA5E9', textDecoration: 'none' }}>
                    their interview link
                  </a>{' '}
                  first.
                </div>
              </div>
            )}

            {txEntries.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                    color: entry.speaker === 'ai' ? '#0EA5E9' : '#10B981',
                  }}>
                    {entry.speaker === 'ai' ? '🤖 AI (Alex)' : `👤 ${candidate.name.split(' ')[0]}`}
                  </span>
                  <span style={{ fontSize: 9, color: '#334155' }}>
                    {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {entry.type !== 'preset' && entry.type !== 'intro' && entry.type !== 'closing' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                      background: 'rgba(139,92,246,0.2)', color: '#A78BFA', letterSpacing: '0.04em',
                    }}>
                      {entry.type.toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 13, color: entry.speaker === 'ai' ? '#CBD5E1' : '#94A3B8',
                  lineHeight: 1.6, paddingLeft: 0,
                  opacity: entry.text.startsWith('[System') ? 0.5 : 1,
                  fontStyle: entry.text.startsWith('[System') ? 'italic' : 'normal',
                }}>
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Evaluation panel ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Phase status */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, color: phaseColor,
                background: `${phaseColor}18`, border: `1px solid ${phaseColor}30`,
                padding: '3px 10px', borderRadius: 100, letterSpacing: '0.04em',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: phaseColor, display: 'inline-block' }} />
                {phaseLabel.toUpperCase()}
              </span>
            </div>

            {/* Running score */}
            {session && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Running Score</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: score >= 80 ? '#10B981' : score >= 60 ? '#0EA5E9' : '#F59E0B', lineHeight: 1 }}>
                    {responses.length > 0 ? `${score}` : '—'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#10B981' : score >= 60 ? '#0EA5E9' : '#F59E0B', borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
                    {responses.length} question{responses.length !== 1 ? 's' : ''} evaluated
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Question-by-question scores */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Evaluation Progress
            </div>

            {responses.length === 0 && (
              <div style={{ fontSize: 12, color: '#334155', paddingTop: 8 }}>
                Scores appear here as questions are answered.
              </div>
            )}

            {responses.map((r, idx) => {
              const color = r.score >= 80 ? '#10B981' : r.score >= 60 ? '#0EA5E9' : '#F59E0B'
              return (
                <div
                  key={r.questionId}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    display: 'flex', flexDirection: 'column', gap: 7,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: SECTION_COLOR[r.questionType] ?? '#94A3B8', letterSpacing: '0.05em' }}>
                      {r.questionType?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: '#475569' }}>Q{idx + 1}</span>
                    {r.isPreset
                      ? <span style={{ fontSize: 9, color: '#475569', marginLeft: 'auto' }}>PRESET</span>
                      : <span style={{ fontSize: 9, color: '#8B5CF6', marginLeft: 'auto' }}>DYNAMIC</span>
                    }
                    <CheckCircle2 size={12} color="#10B981" />
                  </div>

                  <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.45 }}>
                    {r.questionText.slice(0, 80)}{r.questionText.length > 80 ? '…' : ''}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.score}%`, background: color, borderRadius: 2 }} />
                    </div>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 800, color, minWidth: 28, textAlign: 'right' }}>
                      {r.score}
                    </span>
                  </div>

                  {r.evaluatorNote && (
                    <div style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', lineHeight: 1.4, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                      {r.evaluatorNote}
                    </div>
                  )}

                  {r.keyPointsCovered.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {r.keyPointsCovered.slice(0, 3).map((p) => (
                        <span key={p} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>
                          ✓ {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Status indicators */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Agent', active: true, color: '#10B981' },
                { label: 'Candidate', active: !!session, color: '#0EA5E9' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: s.active ? s.color : '#334155',
                    boxShadow: s.active ? `0 0 6px ${s.color}` : 'none',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 11, color: s.active ? s.color : '#475569', fontWeight: 600 }}>
                    {s.label}: {s.active ? 'Active' : 'Offline'}
                  </span>
                </div>
              ))}

              {/* Tab switches */}
              {(session?.candidateTabSwitches ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                  <AlertCircle size={11} color="#F59E0B" />
                  <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>
                    {session!.candidateTabSwitches} tab switch{session!.candidateTabSwitches !== 1 ? 'es' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Code / whiteboard indicators */}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: session?.codeEditorContent ? '#0EA5E9' : '#334155' }}>
                <Code2 size={12} />
                <span>Code Editor: {session?.codeEditorContent ? 'active' : 'not opened'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: session?.whiteboardImageUrl ? '#EC4899' : '#334155' }}>
                <PenLine size={12} />
                <span>Whiteboard: {session?.whiteboardImageUrl ? 'saved' : 'not used'}</span>
              </div>
            </div>

            {/* Dynamic questions count */}
            {(session?.dynamicQuestionsGenerated ?? 0) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#A78BFA' }}>
                <Zap size={12} />
                <span>{session!.dynamicQuestionsGenerated} dynamic question{session!.dynamicQuestionsGenerated !== 1 ? 's' : ''} generated</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Send Message modal ── */}
      {showMessage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{ background: '#1E293B', borderRadius: 16, padding: '28px', maxWidth: 420, width: '100%', margin: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#E2E8F0' }}>Send Message to Candidate</div>
              <button onClick={() => setShowMessage(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              For emergencies only. The message appears as a banner overlay in the candidate&apos;s interview window.
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="e.g. Please check your microphone — we can hear you."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                color: '#E2E8F0', fontSize: 13, lineHeight: 1.5, resize: 'vertical',
                minHeight: 80, fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setShowMessage(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94A3B8', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#0EA5E9', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
