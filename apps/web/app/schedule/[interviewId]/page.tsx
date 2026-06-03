'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Zap, CheckCircle2, AlertCircle, Loader2, Calendar, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface InterviewMeta {
  id: string
  status: string
  scheduledAt: string | null
  duration: number
  candidate: { name: string; email: string }
  position: {
    title: string
    company: string
    interviewDuration: number
    agency?: { name: string; logoUrl?: string }
  }
}

// Generate available slots: next 14 weekdays, times in IST
function generateSlots(): { date: Date; label: string; slots: { iso: string; label: string }[] }[] {
  const IST_OFFSET = 5.5 * 60 // minutes
  const now = new Date()
  const todayIST = new Date(now.getTime() + (IST_OFFSET - now.getTimezoneOffset()) * 60000)

  const result: { date: Date; label: string; slots: { iso: string; label: string }[] }[] = []
  const TIMES = [
    { hour: 10, label: '10:00 AM' },
    { hour: 11, label: '11:00 AM' },
    { hour: 14, label: '2:00 PM' },
    { hour: 15, label: '3:00 PM' },
    { hour: 16, label: '4:00 PM' },
  ]
  let daysAdded = 0
  let offset = 1
  while (daysAdded < 14) {
    const d = new Date(todayIST)
    d.setDate(d.getDate() + offset)
    offset++
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue // skip weekends

    const slots = TIMES.map(t => {
      // Build ISO string at the given IST hour
      const slotIST = new Date(d)
      slotIST.setHours(t.hour, 0, 0, 0)
      // Convert to UTC for storage
      const utcMs = slotIST.getTime() - IST_OFFSET * 60000
      return {
        iso:   new Date(utcMs).toISOString(),
        label: `${t.label} IST`,
      }
    })

    result.push({
      date:  d,
      label: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
      slots,
    })
    daysAdded++
  }
  return result
}

export default function SchedulePage() {
  const params      = useParams()
  const interviewId = params.interviewId as string

  const [meta,       setMeta]       = useState<InterviewMeta | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [confirmed,  setConfirmed]  = useState(false)
  const [confirmedMeta, setConfirmedMeta] = useState<{ dateStr: string; joinUrl: string } | null>(null)

  const [selectedDate,  setSelectedDate]  = useState<number | null>(null) // index into allDays
  const [selectedSlot,  setSelectedSlot]  = useState<string | null>(null) // ISO string
  const [submitting,    setSubmitting]    = useState(false)

  const allDays = generateSlots()

  useEffect(() => {
    if (!interviewId) return
    fetch(`/api/interviews/${interviewId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setMeta(d)
        if (d.scheduledAt) setConfirmed(true) // already scheduled
      })
      .catch(() => setError('Could not load interview details'))
      .finally(() => setLoading(false))
  }, [interviewId])

  async function handleConfirm() {
    if (!selectedSlot) return
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/schedule/${interviewId}/confirm`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ selectedSlot }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Booking failed')
      setConfirmedMeta({ dateStr: data.dateStr, joinUrl: data.joinUrl })
      setConfirmed(true)
      toast.success('Interview scheduled!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm slot')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <Loader2 size={32} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  )

  // ── Error ──
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Invalid scheduling link</h2>
        <p style={{ color: '#94A3B8', fontSize: 14 }}>Please contact your recruiter for a new link.</p>
      </div>
    </div>
  )

  // ── Already confirmed ──
  if (confirmed) {
    const dateDisplay = confirmedMeta?.dateStr ??
      (meta?.scheduledAt ? new Date(meta.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }) + ' IST' : 'your chosen time')
    const joinUrl = confirmedMeta?.joinUrl ?? `/interview/${interviewId}`
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 440, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '40px', boxShadow: '0 4px 20px rgba(16,185,129,0.08)' }}>
          <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>Interview Confirmed!</h2>
          <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Your slot is booked for <strong>{dateDisplay}</strong>.<br />
            A confirmation email with your join link has been sent.
          </p>
          <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>
              {meta?.position.title} at {meta?.position.company}
            </div>
            <div style={{ fontSize: 13, color: '#047857' }}>{dateDisplay}</div>
          </div>
          <a href={joinUrl} style={{ display: 'block', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', padding: '14px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            Join Interview When Ready →
          </a>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 14 }}>You will also receive a reminder email 24 hours before your interview.</p>
        </div>
      </div>
    )
  }

  if (!meta) return null

  const selectedDayData = selectedDate !== null ? allDays[selectedDate] : null

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#4F46E5' }}>
          {meta.position.agency?.name ?? 'Levl1'}
        </span>
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Position info */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#4F46E5', margin: '0 0 6px' }}>
            Schedule Your Interview
          </h1>
          <p style={{ fontSize: 15, color: '#475569', fontWeight: 600, margin: '0 0 4px' }}>
            {meta.position.title} at {meta.position.company}
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            Hi {meta.candidate.name} · Duration: {meta.position.interviewDuration ?? 30} minutes · AI voice interview
          </p>
        </div>

        {/* Date picker */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calendar size={16} color="#4F46E5" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#4F46E5' }}>Select a date</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
            {allDays.slice(0, 10).map((day, i) => (
              <button key={i} type="button" onClick={() => { setSelectedDate(i); setSelectedSlot(null) }}
                style={{
                  padding: '10px 12px', borderRadius: 9, border: `2px solid ${selectedDate === i ? '#4F46E5' : '#E2E8F0'}`,
                  background: selectedDate === i ? 'rgba(79,70,229,0.06)' : '#F8FAFC',
                  color: selectedDate === i ? '#4F46E5' : '#475569', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', lineHeight: 1.4,
                }}>
                <div style={{ fontWeight: 700 }}>{day.date.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                <div style={{ opacity: 0.8 }}>{day.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Time slots */}
        {selectedDayData && (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Clock size={16} color="#4F46E5" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#4F46E5' }}>
                Available times for {selectedDayData.label}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedDayData.slots.map(slot => (
                <label key={slot.iso} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 9, border: `2px solid ${selectedSlot === slot.iso ? '#4F46E5' : '#E2E8F0'}`,
                  background: selectedSlot === slot.iso ? 'rgba(79,70,229,0.06)' : '#F8FAFC',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}>
                  <input type="radio" name="slot" value={slot.iso} checked={selectedSlot === slot.iso}
                    onChange={() => setSelectedSlot(slot.iso)}
                    style={{ accentColor: '#4F46E5', width: 16, height: 16 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: selectedSlot === slot.iso ? '#4F46E5' : '#475569' }}>
                    {slot.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Confirm button */}
        <button onClick={handleConfirm} disabled={!selectedSlot || submitting}
          style={{
            width: '100%', background: !selectedSlot || submitting ? '#94A3B8' : 'linear-gradient(135deg,#4F46E5,#7C3AED)',
            color: '#fff', border: 'none', borderRadius: 12, padding: '16px 20px',
            fontSize: 16, fontWeight: 700, cursor: !selectedSlot || submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: !selectedSlot ? 'none' : '0 4px 14px rgba(79,70,229,0.28)',
            fontFamily: 'var(--font-sans)',
          }}>
          {submitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Confirming…</> : 'Confirm My Interview Slot →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 16 }}>
          A confirmation email will be sent to {meta.candidate.email} with your interview join link.
        </p>
      </div>
    </div>
  )
}
