'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, CheckCircle2, ShieldCheck, Zap } from 'lucide-react'
import type { CandidatePortalData } from '@/lib/candidatePortal'
import { CandidateShell as Shell, BrandButton, onBrand } from '@/components/screen/candidate/CandidateShell'
import { ConsentCheckbox } from '@/components/interviews/ConsentCheckbox'
import { Alert } from '@/components/screen/ui'

// Candidate scheduling (white-label). Order: consent (enlarged checkbox, logged
// server-side with a timestamp) → "Interview now" or pick a slot. Slots come
// from /api/schedule/:id/slots — config-driven (lib/screen/scheduling/config.ts),
// today onward, lead-time default 0, booked slots excluded.

const TZ = 'Asia/Kolkata'

export default function ScheduleClient({ data }: { data: CandidatePortalData }) {
  const router = useRouter()
  const brand = data.brandColor
  const [selected, setSelected] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [starting, setStarting] = useState(false)
  const [done, setDone] = useState(false)
  const [consented, setConsented] = useState(data.consentGiven)
  const [ack, setAck] = useState(false)               // checkbox — never pre-checked
  const [consenting, setConsenting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[] | null>(null)
  const [tz, setTz] = useState(TZ)
  const [instantStart, setInstantStart] = useState(true)
  const alreadyBooked = !!data.scheduledAt && data.status === 'scheduled' && new Date(data.scheduledAt).getTime() > Date.now() - 30 * 60_000
  const [changing, setChanging] = useState(false)    // already booked → "pick a different time"

  useEffect(() => {
    if (!consented) return
    let alive = true
    fetch(`/api/schedule/${data.interviewId}/slots`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (!alive) return; setSlots(Array.isArray(d.slots) ? d.slots : []); if (d.timezone) setTz(d.timezone); setInstantStart(d.instantStart !== false) })
      .catch(() => { if (alive) { setSlots([]); setError('Couldn\'t load available times. Please refresh, or contact your recruiter.') } })
    return () => { alive = false }
  }, [consented, data.interviewId])

  // Group slots by calendar day in the slot timezone. With the 24/7 window
  // (Fixpack 6 #2) a day has up to 48 times, so the page shows one day at a
  // time (day picker) with times bucketed into parts of the day.
  const grouped = useMemo(() => {
    const map = new Map<string, { iso: string; time: string; hour: number }[]>()
    for (const iso of slots ?? []) {
      const s = new Date(iso)
      const dayKey = s.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz })
      const time = s.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: tz })
      const hour = Number(s.toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false, timeZone: tz }).slice(0, 2)) % 24
      if (!map.has(dayKey)) map.set(dayKey, [])
      map.get(dayKey)!.push({ iso, time, hour })
    }
    return Array.from(map.entries())
  }, [slots, tz])
  const [dayIdx, setDayIdx] = useState(0)
  const activeDay = grouped[Math.min(dayIdx, Math.max(0, grouped.length - 1))]
  const PARTS: { label: string; from: number; to: number }[] = [
    { label: 'Early morning', from: 0, to: 6 }, { label: 'Morning', from: 6, to: 12 },
    { label: 'Afternoon', from: 12, to: 17 }, { label: 'Evening', from: 17, to: 24 },
  ]
  const partOf = (h: number) => PARTS.find((p) => h >= p.from && h < p.to)?.label ?? 'Evening'
  const todayKey = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz })

  async function giveConsent() {
    if (!ack) return
    setConsenting(true)
    setError(null)
    try {
      const res = await fetch(`/api/schedule/${data.interviewId}/consent`, { method: 'POST' })
      if (!res.ok) throw new Error('failed')
      setConsented(true)
    } catch {
      setError('Couldn\'t record your consent. Please try again or contact your recruiter.')
    } finally {
      setConsenting(false)
    }
  }

  async function confirm() {
    if (!selected) return
    setBooking(true)
    setError(null)
    try {
      const endpoint = alreadyBooked ? 'reschedule' : 'confirm'
      const res = await fetch(`/api/schedule/${data.interviewId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSlot: selected }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'failed')
      setDone(true)
      // Move on to the pre-interview page after a moment
      setTimeout(() => router.push(`/candidate/join/${data.interviewId}`), 1800)
    } catch (e) {
      setBooking(false)
      setError(e instanceof Error && e.message !== 'failed' ? e.message : 'Couldn\'t confirm your slot. Please try again or contact your recruiter.')
    }
  }

  async function startNow() {
    setStarting(true)
    setError(null)
    try {
      const res = await fetch(`/api/schedule/${data.interviewId}/start-now`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'failed')
      router.push(d.next || `/candidate/join/${data.interviewId}`)
    } catch (e) {
      setStarting(false)
      setError(e instanceof Error && e.message !== 'failed' ? e.message : 'Couldn\'t start the interview. Please try again or pick a time.')
    }
  }

  const errorBox = error && <Alert tone="danger" style={{ marginTop: 16 }}>{error}</Alert>

  if (done) {
    return (
      <Shell brand={brand} agencyName={data.agencyName} logo={data.agencyLogoUrl}>
        <div role="status" style={{ textAlign: 'center', padding: '24px 0' }}>
          <CheckCircle2 size={48} color="var(--lv-success)" aria-hidden="true" style={{ marginBottom: 12 }} />
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 8px' }}>Slot confirmed!</h1>
          <p style={{ fontSize: 14, color: 'var(--lv-text-muted)' }}>
            A confirmation email is on its way. Redirecting you to the interview page…
          </p>
        </div>
      </Shell>
    )
  }

  // ── Consent gate — nothing below is reachable until the candidate consents ──
  if (!consented) {
    return (
      <Shell brand={brand} agencyName={data.agencyName} logo={data.agencyLogoUrl}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ShieldCheck size={16} color={brand} aria-hidden="true" />
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Before you schedule</h1>
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
            'Before the interview starts you’ll see exactly what is captured (a photo, an audio recording and camera monitoring), why, and for how long, and you’ll be asked to agree to that separately.',
          ].map((line, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--lv-text-body)', lineHeight: 1.5 }}>
              <CheckCircle2 size={16} color={brand} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div style={{ marginBottom: 16 }}>
          <ConsentCheckbox checked={ack} onChange={setAck} disabled={consenting}>
            I understand this interview is conducted by an AI interviewer and that my responses will be recorded and evaluated. I consent to proceed.
          </ConsentCheckbox>
        </div>
        <BrandButton brand={brand} onClick={giveConsent} disabled={!ack} loading={consenting} leftIcon={<ShieldCheck size={16} aria-hidden="true" />}>
          {consenting ? 'Recording…' : 'Continue'}
        </BrandButton>
        {errorBox}
        <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', textAlign: 'center', marginTop: 12 }}>
          Tick the box above to continue. Your acknowledgement is recorded with the date and time.
        </p>
      </Shell>
    )
  }

  const bookedLabel = alreadyBooked
    ? new Date(data.scheduledAt!).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: tz })
    : null
  const showPicker = !alreadyBooked || changing

  return (
    <Shell brand={brand} agencyName={data.agencyName} logo={data.agencyLogoUrl}>
      {alreadyBooked && (
        <Alert tone="success" title="You're booked" style={{ marginBottom: 20 }}
          action={<BrandButton brand={brand} variant="outline" fullWidth={false} onClick={() => router.push(`/candidate/join/${data.interviewId}`)}>Go to interview</BrandButton>}>
          {bookedLabel}
        </Alert>
      )}

      {/* ── Instant start — AI interviews need no human availability ── */}
      {instantStart && (
        <section aria-labelledby="sched-now" style={{ marginBottom: 24 }}>
          <h1 id="sched-now" style={{ fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 4px' }}>
            {alreadyBooked ? 'Want to start sooner?' : 'Ready when you are'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', margin: '0 0 14px' }}>
            Your interviewer is an AI and is available right now — no waiting for a slot. {data.positionTitle} at {data.company} · {data.duration} min.
          </p>
          <BrandButton brand={brand} onClick={startNow} loading={starting} leftIcon={<Zap size={16} aria-hidden="true" />}>
            {starting ? 'Starting…' : 'Interview now'}
          </BrandButton>
        </section>
      )}

      {alreadyBooked && !changing && (
        <button type="button" className="lv-btn lv-btn--tertiary lv-btn--sm" onClick={() => setChanging(true)} style={{ marginTop: instantStart ? 0 : 4 }}>
          Pick a different time
        </button>
      )}

      {showPicker && (
        <section aria-labelledby="sched-later">
          {instantStart && (
            <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 18px', color: 'var(--lv-text-muted)', fontSize: 12, fontWeight: 600 }}>
              <span style={{ flex: 1, height: 1, background: 'var(--lv-border)' }} /> OR SCHEDULE FOR LATER <span style={{ flex: 1, height: 1, background: 'var(--lv-border)' }} />
            </div>
          )}
          <h2 id="sched-later" style={{ fontSize: instantStart ? 16 : 18, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 4px' }}>
            Pick your interview time
          </h2>
          <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', margin: '0 0 16px' }}>
            {instantStart ? 'All times IST.' : `${data.positionTitle} at ${data.company} · ${data.duration} min · all times IST`}
          </p>

          {slots === null ? (
            <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--lv-text-muted)', padding: '12px 0' }}>
              <span className="lv-spinner" aria-hidden="true" style={{ color: brand }} /> Loading available times…
            </div>
          ) : grouped.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--lv-text-muted)' }}>No open times right now{instantStart ? ' — use “Interview now” above.' : '. Please contact your recruiter.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Day picker */}
              <div role="radiogroup" aria-label="Day" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {grouped.map(([day], i) => {
                  const on = activeDay?.[0] === day
                  return (
                    <button key={day} type="button" role="radio" aria-checked={on} className="lv-slot" onClick={() => setDayIdx(i)}
                      style={{ flexShrink: 0, border: `1px solid ${on ? brand : 'var(--lv-border-control)'}`, background: on ? brand : 'var(--lv-surface)', color: on ? onBrand(brand) : 'var(--lv-text-body)' }}>
                      {day === todayKey ? 'Today' : day}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '44vh', overflowY: 'auto', padding: 2 }}>
              {activeDay && PARTS.map((part) => [part, activeDay[1].filter((s) => partOf(s.hour) === part.label)] as const).filter(([, times]) => times.length > 0).map(([part, times]) => (
                <section key={part.label} aria-label={`${activeDay[0]} — ${part.label}`}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text-body)', margin: '0 0 8px' }}>{part.label}</h3>
                  <div role="radiogroup" aria-label={`${part.label} times on ${activeDay[0]}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
            </div>
          )}

          <BrandButton brand={brand} variant={instantStart ? 'outline' : 'solid'} onClick={confirm} disabled={!selected} loading={booking} style={{ marginTop: 22 }}
            leftIcon={<CalendarCheck size={16} aria-hidden="true" />}>
            {booking ? 'Confirming…' : alreadyBooked ? 'Move to this time' : 'Confirm this time'}
          </BrandButton>
        </section>
      )}
      {errorBox}
    </Shell>
  )
}
