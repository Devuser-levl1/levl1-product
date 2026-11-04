'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, CheckCircle2, Camera, ShieldCheck, Mail } from 'lucide-react'
import type { CandidatePortalData } from '@/lib/candidatePortal'
import { BrandButton, PoweredBy, onBrand } from '@/components/screen/candidate/CandidateShell'

// Design-System Pass 3 (group 7): white-label portal on tokens + canonical
// controls; the OTP / identity / photo / mic checks are unchanged.

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

  const card: React.CSSProperties = { padding: 'clamp(20px, 5vw, 28px)', marginBottom: 20, boxShadow: 'var(--lv-shadow-md)' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--lv-bg) 0%, var(--lv-accent-soft) 100%)', padding: '32px 16px', fontFamily: 'var(--lv-font-sans)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Branding */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {data.agencyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.agencyLogoUrl} alt={data.agencyName} height={40} style={{ objectFit: 'contain', maxWidth: 160 }} />
          ) : (
            <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 6, background: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: onBrand(brand), fontWeight: 600 }}>
              {data.agencyName.charAt(0)}
            </div>
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)' }}>{data.agencyName}</div>
            <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Interview Portal</div>
          </div>
        </header>

        {/* Greeting */}
        <section className="lv-card" style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 6px' }}>Hi {data.candidateFirstName}</h1>
          <p style={{ fontSize: 14, color: 'var(--lv-text-body)', margin: '0 0 16px', lineHeight: 1.6 }}>
            You&apos;re about to begin your interview for <strong>{data.positionTitle}</strong> at <strong>{data.company}</strong>.
          </p>
          {scheduledLabel && (
            <div style={{ fontSize: 13, color: 'var(--lv-text-body)', background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: '8px 12px' }}>
              Scheduled for {scheduledLabel}
            </div>
          )}
        </section>

        {/* Verification */}
        <section className="lv-card" aria-labelledby="join-verify" style={card}>
          <h2 id="join-verify" className="lv-eyebrow" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} aria-hidden="true" /> Identity verification
          </h2>

          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {/* Step 1 — OTP */}
          <li style={{ padding: '12px 0', borderBottom: '1px solid var(--lv-border)' }}>
            <Row
              icon={<Mail size={16} />}
              title="Verify your email"
              sub={otpSent ? `Code sent to ${otpEmail}` : 'We’ll send a 6-digit code'}
              status={otpStatus}
            >
              {otpStatus !== 'done' && !otpSent && (
                <ActionBtn brand={brand} busy={otpStatus === 'busy'} onClick={sendOtp}>Send code</ActionBtn>
              )}
            </Row>
            {otpStatus !== 'done' && otpSent && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingLeft: 50, flexWrap: 'wrap' }}>
                <input
                  className="lv-input"
                  aria-label="6-digit email code"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter code"
                  inputMode="numeric"
                  style={{ flex: '1 1 140px', minWidth: 0, letterSpacing: 4 }}
                />
                <ActionBtn brand={brand} busy={otpStatus === 'busy'} onClick={verifyOtp}>Verify</ActionBtn>
              </div>
            )}
            {otpError && <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-warning)', marginTop: 6, paddingLeft: 50 }}>{otpError}</div>}
          </li>

          {/* Step 2 — name */}
          <li><Row icon={<CheckCircle2 size={16} />} title="Confirm your identity" sub={`You are ${data.candidateName}`} status={nameStatus} borderBottom>
            {nameStatus !== 'done' && <ActionBtn brand={brand} busy={nameStatus === 'busy'} onClick={confirmName} disabled={otpStatus !== 'done'}>That&apos;s me</ActionBtn>}
          </Row></li>

          {/* Step 3 — photo */}
          <li><Row icon={<Camera size={16} />} title="Take a verification photo" sub="A single still is captured for integrity" status={photoStatus} borderBottom failHint="Camera access denied — enable it and retry.">
            {photoStatus !== 'done' && <ActionBtn brand={brand} busy={photoStatus === 'busy'} onClick={capturePhoto} disabled={nameStatus !== 'done'}>{photoStatus === 'fail' ? 'Retry' : 'Capture'}</ActionBtn>}
          </Row></li>

          {/* Step 4 — mic */}
          <li><Row icon={<Mic size={16} />} title="Test your microphone" sub="Required for the voice interview" status={micStatus} failHint="Microphone access denied — enable it and retry." last>
            {micStatus !== 'done' && <ActionBtn brand={brand} busy={micStatus === 'busy'} onClick={testMic}>{micStatus === 'fail' ? 'Retry' : 'Test mic'}</ActionBtn>}
          </Row></li>
          </ol>
        </section>

        <BrandButton brand={brand} onClick={startInterview} disabled={!allDone} loading={starting}
          style={{ boxShadow: allDone ? `0 6px 20px ${brand}40` : 'none' }}>
          {allDone ? 'Start Interview →' : 'Complete verification to begin'}
        </BrandButton>

        <PoweredBy />
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: last ? '12px 0 0' : '12px 0', borderBottom: borderBottom ? '1px solid var(--lv-border)' : 'none', flexWrap: 'wrap' }}>
      <div aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 6, flexShrink: 0, background: status === 'done' ? 'var(--lv-success-soft)' : 'var(--lv-surface-muted)', color: status === 'done' ? 'var(--lv-success)' : 'var(--lv-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'done' ? <CheckCircle2 size={16} /> : icon}
      </div>
      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>
          {title}{status === 'done' && <span className="lv-sr-only"> — done</span>}
        </div>
        <div aria-live="polite" style={{ fontSize: 12, color: status === 'fail' ? 'var(--lv-warning)' : 'var(--lv-text-muted)', fontWeight: status === 'fail' ? 600 : 400 }}>{status === 'fail' && failHint ? failHint : sub}</div>
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
    <BrandButton brand={brand} variant="outline" fullWidth={false} onClick={onClick} disabled={disabled} loading={busy} style={{ flexShrink: 0 }}>
      {children}
    </BrandButton>
  )
}
