'use client'
import { useCallback, useEffect, useState } from 'react'
import { RESPONSE_BY_KEY, isFlagged, DEFAULT_NURTURE_INTERVALS } from '@/lib/hire/nurture-constants'

interface Checkin { id: string; dayOffset: number; scheduledFor: string; status: string; channel: string | null; sentAt: string | null; response: string | null; responseVia: string | null; respondedAt: string | null }
interface Row {
  id: string; name: string; email: string | null; phone: string | null; placedAt: string; placedCompany: string | null
  jobTitle: string | null; recruiterId: string | null; recruiterName: string; nurtureOptOut: boolean
  nextCheckin: { dayOffset: number; scheduledFor: string } | null; flagged: boolean; checkins: Checkin[]
}
interface Summary { placed: number; flagged: number; upcoming7d: number; responded: number }
interface Recruiter { id: string; name: string }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—')
const STATUS: Record<string, { c: string; bg: string; label: string }> = {
  scheduled: { c: '#64748B', bg: '#F1F5F9', label: 'Scheduled' },
  sent: { c: '#0369A1', bg: 'rgba(2,132,199,0.12)', label: 'Sent' },
  responded: { c: '#059669', bg: 'rgba(16,185,129,0.12)', label: 'Responded' },
  skipped: { c: '#94A3B8', bg: '#F1F5F9', label: 'Skipped' },
}

export default function NurturePage() {
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recruiters, setRecruiters] = useState<Recruiter[]>([])
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'flagged'>('all')
  const [recruiterId, setRecruiterId] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showPlace, setShowPlace] = useState(false)

  const load = useCallback(() => {
    const qs = new URLSearchParams()
    if (filter !== 'all') qs.set('filter', filter)
    if (recruiterId) qs.set('recruiterId', recruiterId)
    fetch(`/api/hire/nurture?${qs}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d) { setRows(d.candidates ?? []); setSummary(d.summary ?? null); setRecruiters(d.recruiters ?? []) }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [filter, recruiterId])
  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 1080 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Nurture</h1>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Automated post-placement check-ins by Lev — passively confirm candidates are still working (and get paid).</div>
        </div>
        <button onClick={() => setShowPlace(true)} style={{ marginLeft: 'auto', padding: '10px 16px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Mark placed</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '16px 0' }}>
        <Card label="Placed candidates" value={summary?.placed ?? 0} />
        <Card label="Check-ins in next 7d" value={summary?.upcoming7d ?? 0} accent="#0369A1" />
        <Card label="Responses captured" value={summary?.responded ?? 0} accent="#059669" />
        <Card label="⚠ Flagged" value={summary?.flagged ?? 0} accent={(summary?.flagged ?? 0) > 0 ? '#DC2626' : '#64748B'} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {([['all', 'All'], ['upcoming', 'Upcoming'], ['flagged', '⚠ Flagged']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 100, border: '1px solid ' + (filter === k ? '#6D28D9' : '#E2E8F0'), background: filter === k ? 'rgba(109,40,217,0.08)' : '#fff', color: filter === k ? '#6D28D9' : '#64748B', cursor: 'pointer' }}>{l}</button>
        ))}
        <select value={recruiterId} onChange={(e) => setRecruiterId(e.target.value)} style={{ marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }}>
          <option value="">All recruiters</option>
          {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        {!loaded ? <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
          : rows.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No placed candidates here yet. Mark a candidate placed to start nurture check-ins.</div>
          : rows.map((r, i) => (
            <div key={r.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div onClick={() => setExpanded(expanded === r.id ? null : r.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>{r.name}</span>
                    {r.placedCompany && <span style={{ fontSize: 12.5, color: '#64748B' }}>@ {r.placedCompany}</span>}
                    {r.flagged && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#DC2626', background: 'rgba(220,38,38,0.10)', borderRadius: 100, padding: '2px 8px' }}>⚠ NEEDS ATTENTION</span>}
                    {r.nurtureOptOut && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', background: '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>opted out</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3 }}>
                    Placed {fmt(r.placedAt)}{r.jobTitle ? ` · ${r.jobTitle}` : ''} · {r.recruiterName}
                    {r.nextCheckin ? ` · Next: ${r.nextCheckin.dayOffset}-day on ${fmt(r.nextCheckin.scheduledFor)}` : ' · All check-ins complete'}
                  </div>
                </div>
                {/* Interval dots */}
                <div style={{ display: 'flex', gap: 5 }}>
                  {r.checkins.map((ci) => {
                    const col = ci.status === 'responded' ? (isFlagged(ci.response) ? '#DC2626' : '#059669') : ci.status === 'sent' ? '#0369A1' : ci.status === 'skipped' ? '#CBD5E1' : '#E2E8F0'
                    return <span key={ci.id} title={`${ci.dayOffset}d · ${ci.status}`} style={{ width: 22, height: 22, borderRadius: '50%', background: col, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ci.dayOffset}</span>
                  })}
                </div>
                <span style={{ color: '#94A3B8', fontSize: 12 }}>{expanded === r.id ? '▲' : '▼'}</span>
              </div>

              {expanded === r.id && (
                <div style={{ padding: '0 18px 14px 18px' }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {r.checkins.map((ci) => {
                      const st = STATUS[ci.status] ?? STATUS.scheduled
                      const resp = ci.response ? RESPONSE_BY_KEY.get(ci.response as never) : null
                      return (
                        <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#475569' }}>
                          <span style={{ fontWeight: 800, color: '#0F172A', width: 52 }}>{ci.dayOffset}-day</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 100, padding: '2px 9px' }}>{st.label}</span>
                          {ci.sentAt ? <span>sent {fmt(ci.sentAt)}{ci.channel ? ` · ${ci.channel}` : ''}</span> : <span>due {fmt(ci.scheduledFor)}</span>}
                          {resp && <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: isFlagged(ci.response) ? '#DC2626' : '#059669' }}>“{resp.short}”{ci.responseVia ? ` · via ${ci.responseVia}` : ''}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {showPlace && <PlaceModal onClose={() => setShowPlace(false)} onDone={() => { setShowPlace(false); load() }} />}
    </div>
  )
}

function Card({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent ?? '#0F172A', marginTop: 4 }}>{value}</div>
    </div>
  )
}

function PlaceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [cands, setCands] = useState<{ id: string; name: string; currentCompany: string | null; job: { title: string } | null }[]>([])
  const [candidateId, setCandidateId] = useState('')
  const [placedAt, setPlacedAt] = useState(new Date().toISOString().slice(0, 10))
  const [company, setCompany] = useState('')
  const [intervals, setIntervals] = useState<number[]>([...DEFAULT_NURTURE_INTERVALS])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { fetch('/api/hire/candidates?limit=200').then((r) => (r.ok ? r.json() : null)).then((d) => setCands(d?.candidates ?? [])).catch(() => {}) }, [])

  const toggle = (d: number) => setIntervals((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b))

  async function save() {
    if (!candidateId) { setErr('Choose a candidate.'); return }
    if (intervals.length === 0) { setErr('Pick at least one interval.'); return }
    setBusy(true); setErr('')
    const res = await fetch('/api/hire/nurture/place', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, placedAt, company: company || undefined, intervals }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setErr(d.error ?? 'Could not save.'); return }
    onDone()
  }

  const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 460, maxWidth: '100%' }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Mark candidate placed</div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>Schedules Lev&apos;s post-placement check-ins from the placement date.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={lbl}>Candidate</label>
            <select style={inp} value={candidateId} onChange={(e) => { setCandidateId(e.target.value); const c = cands.find((x) => x.id === e.target.value); if (c && !company) setCompany(c.job?.title ? '' : (c.currentCompany ?? '')) }}>
              <option value="">— Choose a candidate —</option>
              {cands.map((c) => <option key={c.id} value={c.id}>{c.name}{c.currentCompany ? ` · ${c.currentCompany}` : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Placement date</label><input style={inp} type="date" value={placedAt} onChange={(e) => setPlacedAt(e.target.value)} /></div>
            <div><label style={lbl}>Placed at (company)</label><input style={inp} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Employer" /></div>
          </div>
          <div>
            <label style={lbl}>Check-in intervals (days)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DEFAULT_NURTURE_INTERVALS.map((d) => (
                <button key={d} type="button" onClick={() => toggle(d)} style={{ fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (intervals.includes(d) ? '#6D28D9' : '#E2E8F0'), background: intervals.includes(d) ? 'rgba(109,40,217,0.08)' : '#fff', color: intervals.includes(d) ? '#6D28D9' : '#64748B' }}>{d}d</button>
              ))}
            </div>
          </div>
          {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>{busy ? 'Saving…' : 'Mark placed & schedule'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
