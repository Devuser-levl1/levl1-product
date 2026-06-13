'use client'
import { useEffect, useState, useCallback } from 'react'
import { ScorecardModal } from '@/components/hire/scorecard-modal'

interface Iv {
  id: string; scheduledAt: string; durationMins: number; type: string; status: string; meetLink: string | null
  interviewers: string[]; scorecard: { overall?: string } | null
  candidate: { id: string; name: string; currentStage: string; job: { id: string; title: string } | null }
}

const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }

function dayBucket(d: Date): string {
  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 7) return 'This week'
  return 'Later'
}

export default function InterviewsPage() {
  const [all, setAll] = useState<Iv[]>([])
  const [tab, setTab] = useState<'Upcoming' | 'Past' | 'Cancelled'>('Upcoming')
  const [menu, setMenu] = useState<string | null>(null)
  const [scorecardFor, setScorecardFor] = useState<string | null>(null)
  const [rescheduleFor, setRescheduleFor] = useState<Iv | null>(null)
  const [moveSuggest, setMoveSuggest] = useState<Iv | null>(null)

  const load = useCallback(() => { fetch('/api/hire/interviews').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setAll(d)).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const now = Date.now()
  const filtered = all.filter((i) => {
    if (tab === 'Cancelled') return i.status === 'CANCELLED'
    if (tab === 'Past') return i.status === 'COMPLETED' || i.status === 'NO_SHOW'
    return i.status === 'SCHEDULED'
  })

  const groups: Record<string, Iv[]> = {}
  for (const i of filtered) {
    const key = tab === 'Upcoming' ? dayBucket(new Date(i.scheduledAt)) : 'All'
    ;(groups[key] ??= []).push(i)
  }
  const order = tab === 'Upcoming' ? ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later'] : ['All']

  async function setStatus(i: Iv, status: string) {
    await fetch(`/api/hire/interviews/${i.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setMenu(null); load()
  }
  async function cancel(i: Iv) {
    if (!confirm('Cancel and remove this interview?')) return
    await fetch(`/api/hire/interviews/${i.id}`, { method: 'DELETE' }); setMenu(null); load()
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Interviews</h1>
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 18 }}>
        {(['Upcoming', 'Past', 'Cancelled'] as const).map((t) => <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === t ? '#4F46E5' : 'transparent'), color: tab === t ? '#4F46E5' : '#64748B', cursor: 'pointer' }}>{t}</button>)}
      </div>

      {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No {tab.toLowerCase()} interviews.</div>}

      {order.filter((k) => groups[k]?.length).map((k) => (
        <div key={k} style={{ marginBottom: 20 }}>
          {tab === 'Upcoming' && <div style={{ fontSize: 12, fontWeight: 800, color: k === 'Overdue' ? '#D97706' : '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groups[k].map((i) => {
              const at = new Date(i.scheduledAt)
              const overdue = i.status === 'SCHEDULED' && at.getTime() < now
              return (
                <div key={i.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {at.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} · {i.candidate.name} · {i.type} · {i.durationMins} min
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{i.candidate.job?.title ?? 'No job'}{i.interviewers.length ? ` · Interviewers: ${i.interviewers.join(', ')}` : ''}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {overdue && <span style={{ fontSize: 10, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', borderRadius: 100, padding: '2px 8px' }}>Needs outcome</span>}
                      {i.scorecard?.overall && <span style={{ fontSize: 10, fontWeight: 700, color: '#4F46E5', background: 'rgba(79,70,229,0.08)', borderRadius: 100, padding: '2px 8px' }}>Scorecard: {i.scorecard.overall.replace('_', ' ')}</span>}
                      {i.status !== 'SCHEDULED' && <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>{i.status}</span>}
                    </div>
                  </div>
                  {i.meetLink && i.status === 'SCHEDULED' && <a href={i.meetLink} target="_blank" rel="noreferrer" style={{ ...inp, fontWeight: 600, color: '#4F46E5', textDecoration: 'none' }}>Join</a>}
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setMenu(menu === i.id ? null : i.id)} style={{ ...inp, cursor: 'pointer' }}>⋯</button>
                    {menu === i.id && (
                      <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 4px 16px rgba(15,23,42,0.1)', zIndex: 10, minWidth: 200 }}>
                        <MI onClick={() => { setRescheduleFor(i); setMenu(null) }}>Reschedule</MI>
                        <MI onClick={() => { setScorecardFor(i.id); setMenu(null) }}>Mark Completed + Scorecard</MI>
                        <MI onClick={() => setStatus(i, 'NO_SHOW')}>Mark No-show</MI>
                        <MI onClick={() => { setScorecardFor(i.id); setMenu(null) }}>Add Scorecard</MI>
                        <MI danger onClick={() => cancel(i)}>Cancel</MI>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {scorecardFor && <ScorecardModal interviewId={scorecardFor} onClose={() => setScorecardFor(null)} onSaved={(overall) => { const iv = all.find((x) => x.id === scorecardFor); setScorecardFor(null); load(); if ((overall === 'strong_yes' || overall === 'yes') && iv) setMoveSuggest(iv) }} />}
      {rescheduleFor && <RescheduleModal iv={rescheduleFor} onClose={() => setRescheduleFor(null)} onSaved={() => { setRescheduleFor(null); load() }} />}
      {moveSuggest && (
        <div onClick={() => setMoveSuggest(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 380 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Strong result 🎉</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>Move {moveSuggest.candidate.name} to the next pipeline stage? You can do this from the pipeline board.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setMoveSuggest(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Not now</button>
              <a href="/hire/pipeline" style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>Open pipeline →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MI({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: danger ? '#DC2626' : '#334155' }}>{children}</button>
}

function RescheduleModal({ iv, onClose, onSaved }: { iv: Iv; onClose: () => void; onSaved: () => void }) {
  const [when, setWhen] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!when) return
    setSaving(true)
    await fetch(`/api/hire/interviews/${iv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: new Date(when).toISOString() }) })
    setSaving(false); onSaved()
  }
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 380 }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Reschedule — {iv.candidate.name}</div>
      <input style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 12 }} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? '…' : 'Reschedule'}</button>
      </div>
    </div>
  </div>
}
