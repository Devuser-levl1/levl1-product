'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, CheckCircle2, Loader2, Camera, UserCheck, ShieldCheck } from 'lucide-react'
import type { CandidatePortalData } from '@/lib/candidatePortal'

type StepStatus = 'idle' | 'busy' | 'done' | 'fail'

export default function JoinClient({ data }: { data: CandidatePortalData }) {
  const router = useRouter()
  const brand = data.brandColor

  const [micStatus, setMicStatus] = useState<StepStatus>('idle')
  const [nameStatus, setNameStatus] = useState<StepStatus>('idle')
  const [photoStatus, setPhotoStatus] = useState<StepStatus>('idle')
  const [starting, setStarting] = useState(false)

  const allDone = micStatus === 'done' && nameStatus === 'done' && photoStatus === 'done'

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

  async function testCamera() {
    setPhotoStatus('busy')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((t) => t.stop())
      setPhotoStatus('done')
    } catch {
      setPhotoStatus('fail')
    }
  }

  function confirmName() {
    setNameStatus('done')
  }

  function startInterview() {
    setStarting(true)
    // Hand off to the live interview room.
    router.push(`/interview/${data.interviewId}`)
  }

  const scheduledLabel = data.scheduledAt
    ? new Date(data.scheduledAt).toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    : null

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #F0EBFF 100%)',
        padding: '32px 16px',
        fontFamily: 'var(--font-sans)',
      }}
    >
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

        {/* Greeting card */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, marginBottom: 20, boxShadow: '0 4px 20px rgba(15,23,42,0.04)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            Hi {data.candidateFirstName} 👋
          </h1>
          <p style={{ fontSize: 14, color: '#475569', margin: '0 0 16px', lineHeight: 1.6 }}>
            You&apos;re about to begin your interview for <strong>{data.positionTitle}</strong> at{' '}
            <strong>{data.company}</strong>.
          </p>
          {scheduledLabel && (
            <div style={{ fontSize: 13, color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px' }}>
              📅 Scheduled for {scheduledLabel}
            </div>
          )}

          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Info icon="⏱" label={`${data.duration} minutes`} sub="Voice AI interview" />
            <Info icon="🎧" label="Quiet space" sub="Use headphones" />
          </div>
        </div>

        {/* Verification steps */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} /> Before you start
          </div>

          <Step
            icon={<UserCheck size={18} />}
            title="Confirm your identity"
            sub={`You are ${data.candidateName}`}
            status={nameStatus}
            actionLabel="That's me"
            onAction={confirmName}
            brand={brand}
          />
          <Step
            icon={<Mic size={18} />}
            title="Test your microphone"
            sub="We need to hear you clearly"
            status={micStatus}
            actionLabel="Test mic"
            onAction={testMic}
            brand={brand}
            failHint="Microphone access denied — enable it in your browser and retry."
          />
          <Step
            icon={<Camera size={18} />}
            title="Enable your camera"
            sub="Required for interview integrity"
            status={photoStatus}
            actionLabel="Enable camera"
            onAction={testCamera}
            brand={brand}
            failHint="Camera access denied — enable it in your browser and retry."
            last
          />
        </div>

        <button
          onClick={startInterview}
          disabled={!allDone || starting}
          style={{
            width: '100%',
            padding: '15px 20px',
            borderRadius: 12,
            border: 'none',
            fontSize: 15,
            fontWeight: 800,
            color: '#fff',
            cursor: allDone && !starting ? 'pointer' : 'not-allowed',
            background: allDone ? brand : '#CBD5E1',
            boxShadow: allDone ? `0 6px 20px ${brand}40` : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {starting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {allDone ? 'Start Interview →' : 'Complete the steps above to begin'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#CBD5E1' }}>
          Powered by Levl1
        </div>
      </div>
    </div>
  )
}

function Info({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#94A3B8' }}>{sub}</div>
    </div>
  )
}

function Step({
  icon, title, sub, status, actionLabel, onAction, brand, failHint, last,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  status: StepStatus
  actionLabel: string
  onAction: () => void
  brand: string
  failHint?: string
  last?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: last ? 'none' : '1px solid #F1F5F9' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: status === 'done' ? 'rgba(16,185,129,0.10)' : '#F1F5F9', color: status === 'done' ? '#10B981' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'done' ? <CheckCircle2 size={18} /> : icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{title}</div>
        <div style={{ fontSize: 12, color: status === 'fail' ? '#D97706' : '#94A3B8' }}>
          {status === 'fail' && failHint ? failHint : sub}
        </div>
      </div>
      {status !== 'done' && (
        <button
          onClick={onAction}
          disabled={status === 'busy'}
          style={{
            flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 8,
            border: `1px solid ${brand}`, background: status === 'fail' ? '#FEF3C7' : '#fff',
            color: brand, cursor: status === 'busy' ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {status === 'busy' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
          {status === 'fail' ? 'Retry' : actionLabel}
        </button>
      )}
    </div>
  )
}
