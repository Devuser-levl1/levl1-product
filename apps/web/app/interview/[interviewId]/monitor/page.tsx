'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'
import {
  Radio, Clock, CheckCircle2, AlertCircle, Zap,
  Code2, PenLine, MessageSquare, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, ButtonLink, Badge, EmptyState, Modal, ActionBar, Field, Textarea, type Tone } from '@/components/screen/ui'
import { lv, space, text, radius } from '@/lib/screen/ui/tokens'

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
  technical:  lv.brandText,
  behavioral: lv.success,
  scenario:   lv.accent,
  eq:         lv.warning,
  whiteboard: lv.info,
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

  /* ── Dark console: scope the dark tokens to <html> so portalled dialogs match ── */
  useEffect(() => {
    const el = document.documentElement
    const prev = el.getAttribute('data-lv-theme')
    el.setAttribute('data-lv-theme', 'dark')
    return () => { if (prev === null) el.removeAttribute('data-lv-theme'); else el.setAttribute('data-lv-theme', prev) }
  }, [])

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
      <div data-lv-theme="dark" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: lv.bg, padding: space[4] }}>
        <EmptyState icon={<AlertCircle size={22} />} title="Interview not found"
          description={<>ID: <span className="font-mono">{interviewId}</span></>}
          action={<ButtonLink href="/dashboard" variant="secondary">Back to dashboard</ButtonLink>} />
      </div>
    )
  }

  const session   = activeSession?.interviewId === interviewId ? activeSession : null
  const responses = session?.questionResponses ?? []
  const txEntries = session?.transcript ?? []
  const score     = session?.runningScore ?? 0
  const phase     = session?.phase ?? 'waiting'

  const phaseTone: Tone =
    phase === 'listening'   ? 'success'
    : phase === 'speaking'  ? 'brand'
    : phase === 'processing'? 'info'
    : phase === 'completed' ? 'success'
    : 'neutral'

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
  const scoreColor = (n: number) => (n >= 80 ? lv.success : n >= 60 ? lv.brand : lv.warning)
  const divider = `1px solid ${lv.border}`

  /* ═══════════════════════════════════════════════════════════════
     RENDER — a dark console: the Screen tokens under data-lv-theme="dark"
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div data-lv-theme="dark" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: lv.bg, color: lv.text, fontFamily: lv.fontSans }}>
      <style>{`@media (max-width: 860px) { .mon-body { grid-template-columns: minmax(0, 1fr) !important; grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); } .mon-left { border-right: none !important; border-bottom: ${divider}; } }`}</style>

      {/* ── Header ── */}
      <header style={{
        padding: `${space[2]}px clamp(16px, 3vw, 28px)`, minHeight: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[3], flexWrap: 'wrap',
        background: lv.surface, borderBottom: divider, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space[3], minWidth: 0 }}>
          <Badge tone="danger" dot>LIVE MONITOR</Badge>
          <h1 style={{ margin: 0, fontSize: text.sm, fontWeight: 600, color: lv.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {candidate.name} · {position.title}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space[3], flexWrap: 'wrap' }}>
          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color={lv.textMuted} aria-hidden="true" />
            <span className="font-mono" style={{ fontSize: text.sm, fontWeight: 600, color: timeRemaining <= 120 && session ? lv.danger : timeRemaining <= 300 && session ? lv.warning : lv.textMuted }}>
              {session ? `${fmt(elapsedSecs)} elapsed · ${fmt(timeRemaining)} left` : '—'}
            </span>
          </div>

          {/* Candidate link */}
          <ButtonLink href={`/interview/${interviewId}`} target="_blank" rel="noopener noreferrer" variant="tertiary" size="sm"
            leftIcon={<ExternalLink size={14} />} aria-label="Candidate view (opens in new tab)">
            Candidate View
          </ButtonLink>

          <Button variant="secondary" size="sm" leftIcon={<MessageSquare size={14} />} onClick={() => setShowMessage(true)}>
            Message
          </Button>

          <Button variant="destructive" size="sm" onClick={handleEndInterview}>
            End Interview
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mon-body" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', overflow: 'hidden' }}>

        {/* LEFT: Live transcript ─────────────────────────────── */}
        <section className="mon-left" aria-labelledby="mon-tx" style={{ display: 'flex', flexDirection: 'column', borderRight: divider, overflow: 'hidden' }}>
          <div style={{ padding: `${space[3]}px ${space[5]}px`, borderBottom: divider, display: 'flex', alignItems: 'center', gap: space[2] }}>
            <h2 id="mon-tx" className="lv-eyebrow">Live Transcript</h2>
            {txEntries.length > 0 && (
              <span style={{ fontSize: text.xs, color: lv.textMuted, fontWeight: 600 }}>{txEntries.length} entries</span>
            )}
          </div>

          <div
            ref={transcriptRef}
            aria-live="polite"
            style={{ flex: 1, overflowY: 'auto', padding: `${space[4]}px ${space[5]}px`, display: 'flex', flexDirection: 'column', gap: space[3] }}
          >
            {txEntries.length === 0 && !session && (
              <EmptyState plain icon={<Radio size={22} />} title="Waiting for interview to start"
                description={<>Candidate must open{' '}
                  <a href={`/interview/${interviewId}`} target="_blank" rel="noopener noreferrer" style={{ color: lv.brandText }}>
                    their interview link
                  </a>{' '}first.</>} />
            )}

            {txEntries.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
                  <span style={{ fontSize: text.xs, fontWeight: 600, letterSpacing: '0.03em', color: entry.speaker === 'ai' ? lv.brandText : lv.success }}>
                    {entry.speaker === 'ai' ? `AI (${INTERVIEWER_NAME})` : candidate.name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: 11, color: lv.textMuted }}>
                    {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {entry.type !== 'preset' && entry.type !== 'intro' && entry.type !== 'closing' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: radius.sm, background: lv.accentSoft, color: lv.accent, letterSpacing: '0.04em' }}>
                      {entry.type.toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: text.sm, color: entry.speaker === 'ai' ? lv.text : lv.textBody,
                  lineHeight: 1.6,
                  opacity: entry.text.startsWith('[System') ? 0.6 : 1,
                  fontStyle: entry.text.startsWith('[System') ? 'italic' : 'normal',
                }}>
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT: Evaluation panel ─────────────────────────────── */}
        <aside aria-label="Evaluation" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: lv.surfaceSunken }}>

          {/* Phase status */}
          <div style={{ padding: `${space[3]}px ${space[4]}px`, borderBottom: divider, display: 'flex', flexDirection: 'column', gap: space[3] }}>
            <div role="status">
              <Badge tone={phaseTone} dot>{phaseLabel.toUpperCase()}</Badge>
            </div>

            {/* Running score */}
            {session && (
              <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
                <div>
                  <div className="lv-eyebrow">Running Score</div>
                  <div style={{ fontFamily: lv.fontDisplay, fontSize: text['2xl'], fontWeight: 600, color: scoreColor(score), lineHeight: 1 }}>
                    {responses.length > 0 ? `${score}` : '—'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div role="progressbar" aria-label="Running score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} style={{ height: 6, borderRadius: 3, background: lv.surfaceMuted, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: scoreColor(score), borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 4 }}>
                    {responses.length} question{responses.length !== 1 ? 's' : ''} evaluated
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Question-by-question scores */}
          <div style={{ flex: 1, overflowY: 'auto', padding: `${space[3]}px ${space[4]}px`, display: 'flex', flexDirection: 'column', gap: space[3] }}>
            <h2 className="lv-eyebrow" style={{ marginBottom: 4 }}>Evaluation Progress</h2>

            {responses.length === 0 && (
              <div style={{ fontSize: text.xs, color: lv.textMuted, paddingTop: space[2] }}>
                Scores appear here as questions are answered.
              </div>
            )}

            {responses.map((r, idx) => {
              const color = scoreColor(r.score)
              return (
                <div key={r.questionId} className="lv-card" style={{ padding: `${space[3]}px ${space[3]}px`, display: 'flex', flexDirection: 'column', gap: space[2] }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: SECTION_COLOR[r.questionType] ?? lv.textMuted, letterSpacing: '0.05em' }}>
                      {r.questionType?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, color: lv.textMuted }}>Q{idx + 1}</span>
                    {r.isPreset
                      ? <span style={{ fontSize: 11, color: lv.textMuted, marginLeft: 'auto' }}>PRESET</span>
                      : <span style={{ fontSize: 11, color: lv.textMuted, marginLeft: 'auto' }}>DYNAMIC</span>
                    }
                    <CheckCircle2 size={14} color={lv.success} aria-hidden="true" />
                  </div>

                  <div style={{ fontSize: text.xs, color: lv.textBody, lineHeight: 1.45 }}>
                    {r.questionText.slice(0, 80)}{r.questionText.length > 80 ? '…' : ''}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: space[2] }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: lv.surfaceMuted, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.score}%`, background: color, borderRadius: 2 }} />
                    </div>
                    <span className="font-mono" style={{ fontSize: text.sm, fontWeight: 600, color, minWidth: 28, textAlign: 'right' }}>
                      {r.score}
                    </span>
                  </div>

                  {r.evaluatorNote && (
                    <div style={{ fontSize: text.xs, color: lv.textMuted, fontStyle: 'italic', lineHeight: 1.4, borderTop: divider, paddingTop: 6 }}>
                      {r.evaluatorNote}
                    </div>
                  )}

                  {r.keyPointsCovered.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {r.keyPointsCovered.slice(0, 3).map((p) => (
                        <span key={p} style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: radius.sm, background: lv.successSoft, color: lv.success }}>
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
          <div style={{ padding: `${space[3]}px ${space[4]}px`, borderTop: divider, display: 'flex', flexDirection: 'column', gap: space[2] }}>
            <div style={{ display: 'flex', gap: space[3], flexWrap: 'wrap' }}>
              {[
                { label: 'Agent', active: true, color: lv.success },
                { label: 'Candidate', active: !!session, color: lv.brand },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: s.active ? s.color : lv.borderStrong, display: 'inline-block' }} />
                  <span style={{ fontSize: text.xs, color: s.active ? s.color : lv.textMuted, fontWeight: 600 }}>
                    {s.label}: {s.active ? 'Active' : 'Offline'}
                  </span>
                </div>
              ))}

              {/* Tab switches */}
              {(session?.candidateTabSwitches ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                  <AlertCircle size={12} color={lv.warning} aria-hidden="true" />
                  <span style={{ fontSize: text.xs, color: lv.warning, fontWeight: 600 }}>
                    {session!.candidateTabSwitches} tab switch{session!.candidateTabSwitches !== 1 ? 'es' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Code / whiteboard indicators */}
            <div style={{ display: 'flex', gap: space[3], flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: text.xs, color: session?.codeEditorContent ? lv.brandText : lv.textMuted }}>
                <Code2 size={12} aria-hidden="true" />
                <span>Code Editor: {session?.codeEditorContent ? 'active' : 'not opened'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: text.xs, color: session?.whiteboardImageUrl ? lv.accent : lv.textMuted }}>
                <PenLine size={12} aria-hidden="true" />
                <span>Whiteboard: {session?.whiteboardImageUrl ? 'saved' : 'not used'}</span>
              </div>
            </div>

            {/* Dynamic questions count */}
            {(session?.dynamicQuestionsGenerated ?? 0) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: text.xs, color: lv.accent }}>
                <Zap size={12} aria-hidden="true" />
                <span>{session!.dynamicQuestionsGenerated} dynamic question{session!.dynamicQuestionsGenerated !== 1 ? 's' : ''} generated</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Send Message modal ── (portals to <body>; dark via the <html> data-lv-theme set above) */}
      <Modal open={showMessage} onClose={() => setShowMessage(false)} size="sm" title="Send message to candidate"
        description={<>For emergencies only. The message appears as a banner overlay in the candidate&apos;s interview window.</>}
        footer={<ActionBar>
          <Button variant="secondary" onClick={() => setShowMessage(false)}>Cancel</Button>
          <Button onClick={handleSendMessage} disabled={!messageText.trim()}>Send</Button>
        </ActionBar>}>
        <Field label="Message">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="e.g. Please check your microphone — we can hear you."
            style={{ resize: 'vertical', minHeight: 80 }}
          />
        </Field>
      </Modal>
    </div>
  )
}
