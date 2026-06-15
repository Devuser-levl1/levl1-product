'use client'
import { useState } from 'react'

const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const TYPES = ['Technical', 'Managerial', 'HR', 'Client Round', 'Final']

export function ScheduleInterviewModal({ candidateId, candidateName, jobTitle, onClose, onScheduled }: { candidateId: string; candidateName: string; jobTitle?: string; onClose: () => void; onScheduled: () => void }) {
  const [type, setType] = useState('Technical')
  const [when, setWhen] = useState('')
  const [duration, setDuration] = useState(45)
  const [interviewers, setInterviewers] = useState('')
  const [meetLink, setMeetLink] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [warn, setWarn] = useState('')

  function onWhenChange(v: string) {
    setWhen(v); setWarn('')
    if (v) {
      const d = new Date(v)
      if (d.getTime() < Date.now()) setErr('Time must be in the future'); else setErr('')
      const day = d.getDay()
      if (day === 0 || day === 6) setWarn('Heads up: that’s a weekend.')
    }
  }

  async function save() {
    if (!when) { setErr('Pick a date and time'); return }
    if (new Date(when).getTime() < Date.now()) { setErr('Time must be in the future'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/hire/interviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId,
        scheduledAt: new Date(when).toISOString(),
        durationMins: duration,
        type,
        interviewers: interviewers.split(',').map((s) => s.trim()).filter(Boolean),
        meetLink: meetLink || null,
        notes: notes || null,
      }),
    })
    setSaving(false)
    if (res.ok) onScheduled(); else setErr((await res.json()).error ?? 'Failed to schedule')
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Schedule Interview — {candidateName}</div>
        {jobTitle && <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>{jobTitle}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <div><Label>Type</Label><select style={inp} value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><Label>Date &amp; time (IST)</Label><input style={inp} type="datetime-local" value={when} onChange={(e) => onWhenChange(e.target.value)} /></div>
          <div><Label>Duration</Label><select style={inp} value={duration} onChange={(e) => setDuration(Number(e.target.value))}><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option></select></div>
          <div><Label>Interviewers (names or emails, comma-separated)</Label><input style={inp} placeholder="ramesh@finedge.in, priya@finedge.in" value={interviewers} onChange={(e) => setInterviewers(e.target.value)} /></div>
          <div><Label>Meeting link (optional)</Label><input style={inp} placeholder="https://meet.google.com/..." value={meetLink} onChange={(e) => setMeetLink(e.target.value)} /></div>
          <div><Label>Notes (optional)</Label><textarea style={{ ...inp, minHeight: 60 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          {warn && <div style={{ color: '#D97706', fontSize: 12 }}>{warn}</div>}
          {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Scheduling…' : 'Schedule Interview'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
function Label({ children }: { children: React.ReactNode }) { return <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</label> }
