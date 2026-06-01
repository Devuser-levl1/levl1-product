'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Mic, Video, Volume2, CheckCircle2, AlertTriangle, Loader2, Zap, Clock } from 'lucide-react'

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'pending' && <Loader2 size={16} color="#94A3B8" style={{ animation: 'spin 1s linear infinite' }} />}
        {status === 'ok'      && <CheckCircle2 size={16} color="#10B981" />}
        {status === 'fail'    && <AlertTriangle size={16} color="#F59E0B" />}
      </div>
      <span style={{ fontSize: 14, color: status === 'fail' ? '#D97706' : '#334155', fontWeight: status === 'ok' ? 500 : 400 }}>
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
          setErrorMsg(data.error ?? 'Invalid or unknown link')
          setPageState('error')
          return
        }
        if (data.alreadyUsed) { setPageState('already_used'); return }
        setMeta(data.interview as InterviewMeta)
        setPageState('checking')
      })
      .catch(() => {
        setErrorMsg('Could not reach the server. Please check your connection.')
        setPageState('error')
      })
  }, [token])

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
    router.push(`/interview/${token}`)
  }

  /* ── Loading ── */
  if (pageState === 'loading') {
    return (
      <Shell>
        <Loader2 size={36} color="#7C3AED" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
        <p style={{ fontSize: 15, color: '#94A3B8' }}>Verifying your interview link…</p>
      </Shell>
    )
  }

  /* ── Expired ── */
  if (pageState === 'expired') {
    return (
      <Shell>
        <AlertTriangle size={40} color="#F59E0B" style={{ marginBottom: 16 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
          Link Expired
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', maxWidth: 360, textAlign: 'center', lineHeight: 1.7 }}>
          This interview link has expired. Please contact the recruiting team for a new link.
        </p>
      </Shell>
    )
  }

  /* ── Already used ── */
  if (pageState === 'already_used') {
    return (
      <Shell>
        <CheckCircle2 size={40} color="#10B981" style={{ marginBottom: 16 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
          Interview Already Completed
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', maxWidth: 360, textAlign: 'center', lineHeight: 1.7 }}>
          This interview has already been completed. If you believe this is an error, please contact the recruiting team.
        </p>
      </Shell>
    )
  }

  /* ── Error ── */
  if (pageState === 'error') {
    return (
      <Shell>
        <AlertTriangle size={40} color="#EF4444" style={{ marginBottom: 16 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
          Invalid Link
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', maxWidth: 360, textAlign: 'center', lineHeight: 1.7 }}>
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
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={16} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: '#4F46E5' }}>Levl1</span>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
        padding: '32px 36px', width: '100%', maxWidth: 480,
        boxShadow: '0 4px 24px rgba(79,70,229,0.08)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>
            Welcome, {meta?.candidateName?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
            You are about to start your AI interview for <strong>{meta?.positionTitle}</strong> at <strong>{meta?.company}</strong>.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, color: '#7C3AED', fontWeight: 600 }}>
            <Clock size={13} />
            <span>{meta?.duration ?? 30} minutes</span>
          </div>
        </div>

        {/* Pre-flight checks */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Pre-flight check
          </p>
          <CheckRow label="Microphone access" status={micStatus} />
          <CheckRow label="Audio output"       status={audioStatus} />
          <CheckRow label="Browser compatibility (Web Speech API)" status={browserStatus} />
        </div>

        {/* Warnings */}
        {pageState === 'ready' && !allOk && (
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400E',
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
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 24 }}>
          <input
            type="checkbox"
            checked={consented}
            onChange={e => setConsented(e.target.checked)}
            style={{ marginTop: 2, accentColor: '#7C3AED', width: 15, height: 15, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            I understand this interview will be recorded and evaluated by an AI system. The results will be shared with the hiring team.
          </span>
        </label>

        {/* CTA */}
        <button
          onClick={handleStartInterview}
          disabled={!canStart}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: canStart ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : '#E2E8F0',
            border: 'none', borderRadius: 10, color: canStart ? '#fff' : '#94A3B8',
            fontSize: 15, fontWeight: 700, padding: '14px 20px',
            cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? '0 4px 14px rgba(124,58,237,0.30)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {pageState === 'checking'
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Checking system…</>
            : <><Mic size={16} /> Start Interview</>
          }
        </button>

        <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
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
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8' }}>
            <span style={{ color: '#CBD5E1' }}>{tip.icon}</span>
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
      background: 'linear-gradient(135deg, #F8F9FF 0%, #F0EBFF 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: 'var(--font-sans)',
    }}>
      {children}
    </div>
  )
}
