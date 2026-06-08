'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, CheckCircle2, Loader2, Camera, ShieldCheck, Mail } from 'lucide-react'
import type { CandidatePortalData } from '@/lib/candidatePortal'

type StepStatus = 'idle' | 'busy' | 'done' | 'fail'

export default function JoinClient({ data }: { data: CandidatePortalData }) {
  const router = useRouter()
  const brand = data.brandColor

  // OTP
  const [otpStatus, setOtpStatus] = useState<StepStatus>('idle')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpError, setOtpError] = useState('')

  // Name + photo + mic
  const [nameStatus, setNameStatus] = useState<StepStatus>('idle')
  const [photoStatus, setPhotoStatus] = useState<StepStatus>('idle')
  const [micStatus, setMicStatus] = useState<StepStatus>('idle')
  const [starting, setStarting] = useState(false)

  const allDone =
    otpStatus === 'done' && nameStatus === 'done' && photoStatus === 'done' && micStatus === 'done'

  async function record(payload: Record<string, unknown>) {
    return fetch('/api/interview/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId: data.interviewId, ...payload }),
    }).catch(() => {})
  }

  async function sendOtp() {
    setOtpStatus('busy'); setOtpError('')
    try {
      const res = await fetch('/api/interview/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId: data.interviewId }),
      })
      const d = await res.json()
      if (!res.ok) { setOtpStatus('fail'); setOtpError(d.error ?? 'Could not send code'); return }
      setOtpSent(true); setOtpEmail(d.email ?? '')
      setOtpStatus('idle')
    } catch {
      setOtpStatus('fail'); setOtpError('Could not send code')
    }
  }

  async function verifyOtp() {
    if (otpCode.trim().length < 4) return
    setOtpStatus('busy'); setOtpError('')
    try {
      const res = await fetch('/api/interview/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId: data.interviewId, code: otpCode.trim() }),
      })
      const d = await res.json()
      if (d.verified) { setOtpStatus('done') }
      else { setOtpStatus('fail'); setOtpError(d.error ?? 'Incorrect code') }
    } catch {
      setOtpStatus('fail'); setOtpError('Verification failed')
    }
  }

  async function confirmName() {
    setNameStatus('busy')
    await record({ nameConfirmed: data.candidateName })
    setNameStatus('done')
  }

  async function capturePhoto() {
    setPhotoStatus('busy')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      await new Promise((r) => setTimeout(r, 400)) // let the camera settle
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      const photoUrl = canvas.toDataURL('image/jpeg', 0.6)
      stream.getTracks().forEach((t) => t.stop())
      await record({ photoUrl })
      setPhotoStatus('done')
    } catch {
      setPhotoStatus('fail')
    }
  }

  async function testMic() {
    setMicStatus('busy')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMicStatus('done')
    } catch {
      setMicStatus('fail')
    }
  }

  function startInterview() {
    setStarting(true)
    router.push(`/interview/${data.interviewId}`)
  }

  const scheduledLabel = data.scheduledAt
    ? new Date(data.scheduledAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) + ' IST'
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F8FAFC 0%, #F0EBFF 100%)', padding: '32px 16px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {data.agencyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.agencyLogoUrl} alt={data.agencyName} height={40} style={{ objectFit: 'contain', maxWidth: 160 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 10, background: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
              {data.agencyName.charAt(0)}
            </div>
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{data.agencyName}</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Interview Portal</div>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, marginBottom: 20, boxShadow: '0 4px 20px rgba(15,23,42,0.04)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Hi {data.candidateFirstName} 👋</h1>
          <p style={{ fontSize: 14, color: '#475569', margin: '0 0 16px', lineHeight: 1.6 }}>
            You&apos;re about to begin your interview for <strong>{data.positionTitle}</strong> at <strong>{data.company}</strong>.
          </p>
          {scheduledLabel && (
            <div style={{ fontSize: 13, color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px' }}>
              📅 Scheduled for {scheduledLabel}
            </div>
          )}
        </div>

        {/* Verification */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} /> Identity verification
          </div>

          {/* Step 1 — OTP */}
          <div style={{ padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
            <Row
              icon={<Mail size={18} />}
              title="Verify your email"
              sub={otpSent ? `Code sent to ${otpEmail}` : 'We’ll send a 6-digit code'}
              status={otpStatus}
            >
              {otpStatus !== 'done' && !otpSent && (
                <ActionBtn brand={brand} busy={otpStatus === 'busy'} onClick={sendOtp}>Send code</ActionBtn>
              )}
            </Row>
            {otpStatus !== 'done' && otpSent && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingLeft: 50 }}>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter code"
                  inputMode="numeric"
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, letterSpacing: 4, outline: 'none' }}
                />
                <ActionBtn brand={brand} busy={otpStatus === 'busy'} onClick={verifyOtp}>Verify</ActionBtn>
              </div>
            )}
            {otpError && <div style={{ fontSize: 12, color: '#D97706', marginTop: 6, paddingLeft: 50 }}>{otpError}</div>}
          </div>

          {/* Step 2 — name */}
          <Row icon={<CheckCircle2 size={18} />} title="Confirm your identity" sub={`You are ${data.candidateName}`} status={nameStatus} borderBottom>
            {nameStatus !== 'done' && <ActionBtn brand={brand} busy={nameStatus === 'busy'} onClick={confirmName} disabled={otpStatus !== 'done'}>That&apos;s me</ActionBtn>}
          </Row>

          {/* Step 3 — photo */}
          <Row icon={<Camera size={18} />} title="Take a verification photo" sub="A single still is captured for integrity" status={photoStatus} borderBottom failHint="Camera access denied — enable it and retry.">
            {photoStatus !== 'done' && <ActionBtn brand={brand} busy={photoStatus === 'busy'} onClick={capturePhoto} disabled={nameStatus !== 'done'}>{photoStatus === 'fail' ? 'Retry' : 'Capture'}</ActionBtn>}
          </Row>

          {/* Step 4 — mic */}
          <Row icon={<Mic size={18} />} title="Test your microphone" sub="Required for the voice interview" status={micStatus} failHint="Microphone access denied — enable it and retry." last>
            {micStatus !== 'done' && <ActionBtn brand={brand} busy={micStatus === 'busy'} onClick={testMic}>{micStatus === 'fail' ? 'Retry' : 'Test mic'}</ActionBtn>}
          </Row>
        </div>

        <button
          onClick={startInterview}
          disabled={!allDone || starting}
          style={{
            width: '100%', padding: '15px 20px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 800, color: '#fff',
            cursor: allDone && !starting ? 'pointer' : 'not-allowed',
            background: allDone ? brand : '#CBD5E1', boxShadow: allDone ? `0 6px 20px ${brand}40` : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {starting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {allDone ? 'Start Interview →' : 'Complete verification to begin'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#CBD5E1' }}>Powered by Levl1</div>
      </div>
    </div>
  )
}

function Row({
  icon, title, sub, status, children, borderBottom, last, failHint,
}: {
  icon: React.ReactNode; title: string; sub: string; status: StepStatus
  children?: React.ReactNode; borderBottom?: boolean; last?: boolean; failHint?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: last ? '12px 0 0' : '12px 0', borderBottom: borderBottom ? '1px solid #F1F5F9' : 'none' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: status === 'done' ? 'rgba(16,185,129,0.10)' : '#F1F5F9', color: status === 'done' ? '#10B981' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'done' ? <CheckCircle2 size={18} /> : icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{title}</div>
        <div style={{ fontSize: 12, color: status === 'fail' ? '#D97706' : '#94A3B8' }}>{status === 'fail' && failHint ? failHint : sub}</div>
      </div>
      {children}
    </div>
  )
}

function ActionBtn({
  children, onClick, brand, busy, disabled,
}: {
  children: React.ReactNode; onClick: () => void; brand: string; busy?: boolean; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      style={{
        flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 8,
        border: `1px solid ${disabled ? '#CBD5E1' : brand}`, background: '#fff',
        color: disabled ? '#CBD5E1' : brand, cursor: busy || disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {busy && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  )
}
