'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, CheckCircle2, ShieldCheck } from 'lucide-react'
import { generateAvailableSlots } from '@/lib/slots'
import type { CandidatePortalData } from '@/lib/candidatePortal'
import { CandidateShell as Shell, BrandButton, onBrand } from '@/components/screen/candidate/CandidateShell'
import { Alert } from '@/components/screen/ui'

// Design-System Pass 3 (group 7): shared white-label shell + canonical controls.
// Failures now show inline (same copy) instead of a blocking alert().

export default function ScheduleClient({ data }: { data: CandidatePortalData }) {
  const router = useRouter()
  const brand = data.brandColor
  const [selected, setSelected] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [done, setDone] = useState(false)
  const [consented, setConsented] = useState(data.consentGiven)
  const [consenting, setConsenting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
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
      setError('Could not confirm your slot. Please try again or contact your recruiter.')
    }
  }

  async function giveConsent() {
    setConsenting(true)
    setError(null)
    try {
      const res = await fetch(`/api/schedule/${data.interviewId}/consent`, { method: 'POST' })
      if (!res.ok) throw new Error('failed')
      setConsented(true)
    } catch {
      setConsenting(false)
      setError('Could not record your consent. Please try again or contact your recruiter.')
    }
  }

  const errorBox = error && <Alert tone="danger" style={{ marginTop: 16 }}>{error}</Alert>

  if (done) {
    return (
      <Shell brand={brand} agencyName={data.agencyName} logo={data.agencyLogoUrl}>
        <div role="status" style={{ textAlign: 'center', padding: '24px 0' }}>
          <CheckCircle2 size={48} color="var(--lv-success)" aria-hidden="true" style={{ marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--lv-text)', margin: '0 0 8px' }}>Slot confirmed!</h1>
          <p style={{ fontSize: 14, color: 'var(--lv-text-muted)' }}>
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
          <ShieldCheck size={18} color={brand} aria-hidden="true" />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--lv-text)', margin: 0 }}>Before you schedule</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--lv-text-body)', lineHeight: 1.6, margin: '0 0 16px' }}>
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
            <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--lv-text-body)', lineHeight: 1.5 }}>
              <CheckCircle2 size={16} color={brand} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <BrandButton brand={brand} onClick={giveConsent} loading={consenting} leftIcon={<ShieldCheck size={16} aria-hidden="true" />}>
          {consenting ? 'Recording…' : 'I understand and consent'}
        </BrandButton>
        {errorBox}
        <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', textAlign: 'center', marginTop: 12 }}>
          You must consent before choosing an interview time.
        </p>
      </Shell>
    )
  }

  return (
    <Shell brand={brand} agencyName={data.agencyName} logo={data.agencyLogoUrl}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--lv-text)', margin: '0 0 4px' }}>
        Pick your interview time
      </h1>
      <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', margin: '0 0 20px' }}>
        {data.positionTitle} at {data.company} · {data.duration} min · all times IST
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '52vh', overflowY: 'auto', padding: 2 }}>
        {grouped.map(([day, times]) => (
          <section key={day} aria-label={day}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--lv-text-body)', margin: '0 0 8px' }}>{day}</h2>
            <div role="radiogroup" aria-label={`Times on ${day}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {times.map((t) => {
                const active = selected === t.iso
                return (
                  <button
                    key={t.iso}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className="lv-slot"
                    onClick={() => setSelected(t.iso)}
                    style={{
                      border: `1px solid ${active ? brand : 'var(--lv-border-control)'}`,
                      background: active ? brand : 'var(--lv-surface)',
                      color: active ? onBrand(brand) : 'var(--lv-text-body)',
                    }}
                  >
                    {t.time}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <BrandButton brand={brand} onClick={confirm} disabled={!selected} loading={booking} style={{ marginTop: 22 }}
        leftIcon={<CalendarCheck size={16} aria-hidden="true" />}>
        {booking ? 'Confirming…' : 'Confirm this time'}
      </BrandButton>
      {errorBox}
    </Shell>
  )
}
