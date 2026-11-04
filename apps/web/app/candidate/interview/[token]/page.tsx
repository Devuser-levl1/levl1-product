'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Mic, Video, Volume2, CheckCircle2, AlertTriangle, Loader2, Zap, Clock } from 'lucide-react'
import { ConsentCheckbox } from '@/components/interviews/ConsentCheckbox'

interface InterviewMeta {
  candidateName: string
  positionTitle:  string
  company:        string
  duration:       number
  status:         string
}

type PageState = 'loading' | 'error' | 'already_used' | 'expired' | 'ready' | 'checking'

/* ─── Pre-flight check row ─────────────────────────────────────── */
function CheckRow({ label, status }: { label: string; status: 'ok' | 'fail' | 'pending' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--lv-surface-muted)' }}>
      <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'pending' && <Loader2 size={16} color="var(--lv-text-muted)" style={{ animation: 'spin 1s linear infinite' }} />}
        {status === 'ok'      && <CheckCircle2 size={16} color="var(--lv-success)" />}
        {status === 'fail'    && <AlertTriangle size={16} color="var(--lv-warning)" />}
      </div>
      <span style={{ fontSize: 14, color: status === 'fail' ? 'var(--lv-warning)' : 'var(--lv-text-body)', fontWeight: status === 'ok' ? 500 : 400 }}>
        {label}
      </span>
    </div>
  )
}

export default function CandidateInterviewEntry() {
  const params      = useParams()
  const router      = useRouter()
  const token       = params?.token as string

  const [pageState, setPageState]   = useState<PageState>('loading')
  const [meta, setMeta]             = useState<InterviewMeta | null>(null)
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg]     = useState('')
  const [micStatus, setMicStatus]   = useState<'ok' | 'fail' | 'pending'>('pending')
  const [audioStatus, setAudioStatus] = useState<'ok' | 'fail' | 'pending'>('pending')
  const [browserStatus, setBrowserStatus] = useState<'ok' | 'fail' | 'pending'>('pending')
  const [consented, setConsented]   = useState(false)

  /* Validate token on mount */
  useEffect(() => {
    if (!token) return
    fetch(`/api/interview-token?token=${token}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 410) { setPageState('expired'); return }
          // Rescue: confirmation emails used to put the INTERVIEW ID here instead
          // of a token. If it resolves as an interview, send them to the room.
          if (res.status === 404) {
            const iv = await fetch(`/api/interviews/${encodeURIComponent(token)}`).catch(() => null)
            if (iv?.ok) { router.replace(`/interview/${encodeURIComponent(token)}`); return }
          }
          setErrorMsg(data.error ?? 'Invalid or unknown link')
          setPageState('error')
          return
        }
        if (data.alreadyUsed) { setPageState('already_used'); return }
        setInterviewId(data.interviewId as string)
        setMeta(data.interview as InterviewMeta)
        setPageState('checking')
      })
      .catch(() => {
        setErrorMsg('Could not reach the server. Please check your connection.')
        setPageState('error')
      })
  }, [token, router])

  /* Run pre-flight checks once we are in "checking" state */
  useEffect(() => {
    if (pageState !== 'checking') return

    // Browser check — Web Speech API required
    const hasSpeech = typeof window !== 'undefined' &&
      (!!window.SpeechRecognition || !!(window as unknown as Record<string, unknown>).webkitSpeechRecognition)
    setBrowserStatus(hasSpeech ? 'ok' : 'fail')

    // Audio output check — always passes (we fallback to browser TTS)
    setAudioStatus('ok')

    // Mic check — request permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(t => t.stop())
        setMicStatus('ok')
        setPageState('ready')
      })
      .catch(() => {
        setMicStatus('fail')
        setPageState('ready')
      })
  }, [pageState])

  function handleStartInterview() {
    // The room is keyed by the interview id (not the token).
    if (interviewId) router.push(`/interview/${interviewId}`)
  }

  /* ── Loading ── */
  if (pageState === 'loading') {
    return (
      <Shell>
        <Loader2 size={36} color="var(--lv-accent)" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
        <p style={{ fontSize: 16, color: 'var(--lv-text-muted)' }}>Verifying your interview link…</p>
      </Shell>
    )
  }

  /* ── Expired ── */
  if (pageState === 'expired') {
    return (
      <Shell>
        <AlertTriangle size={40} color="var(--lv-warning)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 8 }}>
          Link Expired
        </h2>
        <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', maxWidth: 360, textAlign: 'center', lineHeight: 1.7 }}>
          This interview link has expired. Please contact the recruiting team for a new link.
        </p>
      </Shell>
    )
  }

  /* ── Already used ── */
  if (pageState === 'already_used') {
    return (
      <Shell>
        <CheckCircle2 size={40} color="var(--lv-success)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 8 }}>
          Interview Already Completed
        </h2>
        <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', maxWidth: 360, textAlign: 'center', lineHeight: 1.7 }}>
          This interview has already been completed. If you believe this is an error, please contact the recruiting team.
        </p>
      </Shell>
    )
  }

  /* ── Error ── */
  if (pageState === 'error') {
    return (
      <Shell>
        <AlertTriangle size={40} color="var(--lv-danger)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 8 }}>
          Invalid Link
        </h2>
        <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', maxWidth: 360, textAlign: 'center', lineHeight: 1.7 }}>
          {errorMsg || 'This interview link is not valid. Please check the link in your invite email.'}
        </p>
      </Shell>
    )
  }

  /* ── Checking / Ready ── */
  const allOk = micStatus === 'ok' && audioStatus === 'ok' && browserStatus === 'ok'
  const canStart = (pageState === 'ready') && consented

  return (
    <Shell>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, var(--lv-brand), var(--lv-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={16} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--lv-font-display)', fontSize: 18, fontWeight: 600, color: 'var(--lv-brand)' }}>Levl1</span>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8,
        padding: '32px 36px', width: '100%', maxWidth: 480,
        boxShadow: '0 4px 24px color-mix(in srgb, var(--lv-brand) 8%, transparent)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 6 }}>
            Welcome, {meta?.candidateName?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', lineHeight: 1.6 }}>
            You are about to start your AI interview for <strong>{meta?.positionTitle}</strong> at <strong>{meta?.company}</strong>.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, color: 'var(--lv-accent)', fontWeight: 600 }}>
            <Clock size={13} />
            <span>{meta?.duration ?? 30} minutes</span>
          </div>
        </div>

        {/* Pre-flight checks */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Pre-flight check
          </p>
          <CheckRow label="Microphone access" status={micStatus} />
          <CheckRow label="Audio output"       status={audioStatus} />
          <CheckRow label="Browser compatibility (Web Speech API)" status={browserStatus} />
        </div>

        {/* Warnings */}
        {pageState === 'ready' && !allOk && (
          <div style={{
            background: 'color-mix(in srgb, var(--lv-warning) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-warning) 25%, transparent)',
            borderRadius: 6, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--lv-warning)',
          }}>
            {micStatus === 'fail' && (
              <p style={{ margin: '0 0 4px' }}>⚠ Microphone blocked — please allow microphone access in your browser settings and reload.</p>
            )}
            {browserStatus === 'fail' && (
              <p style={{ margin: 0 }}>⚠ Your browser may not support voice recognition. Use Chrome or Edge for the best experience.</p>
            )}
          </div>
        )}

        {/* Consent checkbox */}
        <div style={{ marginBottom: 24 }}>
          <ConsentCheckbox checked={consented} onChange={setConsented}>
            I understand this interview will be <strong>recorded and evaluated by an AI system</strong>. The results will be shared with the hiring team.
          </ConsentCheckbox>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleStartInterview}
          disabled={!canStart}
          aria-busy={pageState === 'checking' || undefined}
          className="lv-btn lv-btn--primary lv-btn--full"
          style={{ height: 48, fontSize: 16 }}
        >
          {pageState === 'checking'
            ? <><span className="lv-spinner" aria-hidden="true" /> Checking system…</>
            : <><Mic size={16} aria-hidden="true" /> Start Interview</>
          }
        </button>

        <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          Find a quiet place with a stable internet connection. Speak clearly — the AI will guide you through each question.
        </p>
      </div>

      {/* Tips */}
      <div style={{ marginTop: 24, maxWidth: 480, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { icon: <Mic size={14} />, text: 'Speak naturally, elaborate on examples' },
          { icon: <Video size={14} />, text: 'Camera not required' },
          { icon: <Volume2 size={14} />, text: 'Use headphones if possible' },
        ].map((tip, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--lv-text-muted)' }}>
            <span style={{ color: 'var(--lv-border-strong)' }}>{tip.icon}</span>
            {tip.text}
          </div>
        ))}
      </div>
    </Shell>
  )
}

/* ─── Centered shell ────────────────────────────────────────────── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--lv-bg) 0%, var(--lv-accent-soft) 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: 'var(--lv-font-sans)',
    }}>
      {children}
    </div>
  )
}
