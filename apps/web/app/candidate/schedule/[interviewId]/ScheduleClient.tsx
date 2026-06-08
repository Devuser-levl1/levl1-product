'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CalendarCheck, CheckCircle2, ShieldCheck } from 'lucide-react'
import { generateAvailableSlots } from '@/lib/slots'
import type { CandidatePortalData } from '@/lib/candidatePortal'

export default function ScheduleClient({ data }: { data: CandidatePortalData }) {
  const router = useRouter()
  const brand = data.brandColor
  const [selected, setSelected] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [done, setDone] = useState(false)
  const [consented, setConsented] = useState(data.consentGiven)
  const [consenting, setConsenting] = useState(false)

  // Group up to 30 upcoming slots by IST date
  const grouped = useMemo(() => {
    const slots = generateAvailableSlots(30)
    const map = new Map<string, { iso: string; time: string }[]>()
    for (const s of slots) {
      const dayKey = s.toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
      })
      const time = s.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
      })
      if (!map.has(dayKey)) map.set(dayKey, [])
      map.get(dayKey)!.push({ iso: s.toISOString(), time })
    }
    return Array.from(map.entries())
  }, [])

  async function confirm() {
    if (!selected) return
    setBooking(true)
    try {
      const res = await fetch(`/api/schedule/${data.interviewId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSlot: selected }),
      })
      if (!res.ok) throw new Error('failed')
      setDone(true)
      // Move on to the pre-interview page after a moment
      setTimeout(() => router.push(`/candidate/join/${data.interviewId}`), 1800)
    } catch {
      setBooking(false)
      alert('Could not confirm your slot. Please try again or contact your recruiter.')
    }
  }

  async function giveConsent() {
    setConsenting(true)
    try {
      const res = await fetch(`/api/schedule/${data.interviewId}/consent`, { method: 'POST' })
      if (!res.ok) throw new Error('failed')
      setConsented(true)
    } catch {
      setConsenting(false)
      alert('Could not record your consent. Please try again or contact your recruiter.')
    }
  }

  if (done) {
    return (
      <Shell brand={brand} agencyName={data.agencyName} logo={data.agencyLogoUrl}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <CheckCircle2 size={48} color="#10B981" style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Slot confirmed!</h2>
          <p style={{ fontSize: 14, color: '#64748B' }}>
            A confirmation email is on its way. Redirecting you to the interview page…
          </p>
        </div>
      </Shell>
    )
  }

  // ── Consent gate — slot picker is hidden until the candidate consents ──
  if (!consented) {
    return (
      <Shell brand={brand} agencyName={data.agencyName} logo={data.agencyLogoUrl}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ShieldCheck size={18} color={brand} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>Before you schedule</h1>
        </div>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
          Please read and acknowledge the following about your interview for{' '}
          <strong>{data.positionTitle}</strong> at <strong>{data.company}</strong>.
        </p>
        <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'This is an L1 technical interview conducted by an AI interviewer (not a human).',
            `It takes approximately ${data.duration} minutes.`,
            'It covers technical and behavioral questions.',
            'Your responses will be recorded and evaluated.',
          ].map((line, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
              <CheckCircle2 size={16} color={brand} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={giveConsent}
          disabled={consenting}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
            fontSize: 15, fontWeight: 800, color: '#fff', cursor: consenting ? 'default' : 'pointer',
            background: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {consenting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={16} />}
          {consenting ? 'Recording…' : 'I understand and consent'}
        </button>
        <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 12 }}>
          You must consent before choosing an interview time.
        </p>
      </Shell>
    )
  }

  return (
    <Shell brand={brand} agencyName={data.agencyName} logo={data.agencyLogoUrl}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
        Pick your interview time
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px' }}>
        {data.positionTitle} at {data.company} · {data.duration} min · all times IST
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '52vh', overflowY: 'auto' }}>
        {grouped.map(([day, times]) => (
          <div key={day}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>{day}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {times.map((t) => {
                const active = selected === t.iso
                return (
                  <button
                    key={t.iso}
                    onClick={() => setSelected(t.iso)}
                    style={{
                      fontSize: 13, fontWeight: 700, padding: '9px 14px', borderRadius: 9,
                      border: `1px solid ${active ? brand : '#E2E8F0'}`,
                      background: active ? brand : '#fff',
                      color: active ? '#fff' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {t.time}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={confirm}
        disabled={!selected || booking}
        style={{
          width: '100%', marginTop: 22, padding: '14px 20px', borderRadius: 12, border: 'none',
          fontSize: 15, fontWeight: 800, color: '#fff',
          cursor: selected && !booking ? 'pointer' : 'not-allowed',
          background: selected ? brand : '#CBD5E1',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {booking ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CalendarCheck size={16} />}
        {booking ? 'Confirming…' : 'Confirm this time'}
      </button>
    </Shell>
  )
}

function Shell({
  children, brand, agencyName, logo,
}: {
  children: React.ReactNode
  brand: string
  agencyName: string
  logo: string | null
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F8FAFC 0%, #F0EBFF 100%)', padding: '32px 16px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={agencyName} height={36} style={{ objectFit: 'contain', maxWidth: 160 }} />
          ) : (
            <div style={{ width: 38, height: 38, borderRadius: 10, background: brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              {agencyName.charAt(0)}
            </div>
          )}
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{agencyName}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(15,23,42,0.04)' }}>
          {children}
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#CBD5E1' }}>Powered by Levl1</div>
      </div>
    </div>
  )
}
