'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { CandidateSlideOver } from '@/components/hire/candidate-slideover'
import { skillChip } from '@/lib/hire/skills'

interface Row {
  id: string; name: string; email: string | null; currentTitle: string | null; currentCompany: string | null
  topSkills: string[]; bestScore: number | null; lastScore: number | null; interviewScore: number | null
  source: string | null; status: string; statusTone: string; stage: string
  jobs: { id: string; title: string }[]; jobsCount: number; lastActivityAt: string; createdAt: string
}

type SortKey = 'name' | 'title' | 'bestScore' | 'source' | 'status' | 'jobsCount' | 'lastActivityAt' | 'createdAt'

const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }
const TONE: Record<string, { fg: string; bg: string }> = {
  rejected: { fg: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  hired: { fg: '#059669', bg: 'rgba(16,185,129,0.10)' },
  active: { fg: '#6D28D9', bg: 'rgba(109,40,217,0.08)' },
  pool: { fg: '#475569', bg: '#F1F5F9' },
}
function scoreColor(s: number | null) { if (s == null) return '#94A3B8'; return s >= 80 ? '#059669' : s >= 60 ? '#D97706' : '#DC2626' }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) }

export default function TalentPoolPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<SortKey>('lastActivityAt')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/hire/talent-pool').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d) setRows(d.rows ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const sources = useMemo(() => Array.from(new Set(rows.map((r) => r.source).filter(Boolean))) as string[], [rows])
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.statusTone))), [rows])

  const view = useMemo(() => {
    const q = search.trim().toLowerCase()
    let out = rows.filter((r) => {
      if (source && r.source !== source) return false
      if (status && r.statusTone !== status) return false
      if (!q) return true
      return [r.name, r.email, r.currentTitle, r.currentCompany, ...(r.topSkills || []), ...r.jobs.map((j) => j.title)]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    })
    const cmp = (a: Row, b: Row): number => {
      let av: string | number = '', bv: string | number = ''
      switch (sort) {
        case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break
        case 'title': av = (a.currentTitle ?? '').toLowerCase(); bv = (b.currentTitle ?? '').toLowerCase(); break
        case 'bestScore': av = a.bestScore ?? -1; bv = b.bestScore ?? -1; break
        case 'source': av = (a.source ?? '').toLowerCase(); bv = (b.source ?? '').toLowerCase(); break
        case 'status': av = a.status.toLowerCase(); bv = b.status.toLowerCase(); break
        case 'jobsCount': av = a.jobsCount; bv = b.jobsCount; break
        case 'lastActivityAt': av = +new Date(a.lastActivityAt); bv = +new Date(b.lastActivityAt); break
        case 'createdAt': av = +new Date(a.createdAt); bv = +new Date(b.createdAt); break
      }
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    }
    return [...out].sort(cmp)
  }, [rows, search, source, status, sort, dir])

  const toggleSort = (k: SortKey) => { if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSort(k); setDir(k === 'name' || k === 'title' ? 'asc' : 'desc') } }
  const Arrow = ({ k }: { k: SortKey }) => sort === k ? <span style={{ color: '#6D28D9' }}>{dir === 'asc' ? ' ↑' : ' ↓'}</span> : null
  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th onClick={() => toggleSort(k)} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', cursor: 'pointer', textAlign: right ? 'right' : 'left', whiteSpace: 'nowrap', userSelect: 'none' }}>{children}<Arrow k={k} /></th>
  )

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Talent Pool</h1>
        <span style={{ fontSize: 13, color: '#64748B' }}>Every candidate you’ve ever processed — your growing talent database.</span>
      </div>
      <div style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 16 }}>{view.length} of {rows.length} candidates</div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input style={{ ...inp, minWidth: 260, flex: '0 1 320px' }} placeholder="Search name, title, company, skill, job…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={inp} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {(search || source || status) && <button onClick={() => { setSearch(''); setSource(''); setStatus('') }} style={{ ...inp, cursor: 'pointer', color: '#64748B' }}>Clear</button>}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <Th k="name">Name</Th>
              <Th k="title">Title / Company</Th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'left' }}>Top skills</th>
              <Th k="bestScore" right>Best score</Th>
              <Th k="source">Source</Th>
              <Th k="status">Status</Th>
              <Th k="jobsCount" right>Jobs</Th>
              <Th k="lastActivityAt">Last activity</Th>
              <Th k="createdAt">Added</Th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => {
              const tone = TONE[r.statusTone] ?? TONE.pool
              return (
                <tr key={r.id} onClick={() => setSelected(r.id)} style={{ borderTop: '1px solid #F1F5F9', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFF' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{r.name}</div>
                    {r.email && <div style={{ fontSize: 11.5, color: '#94A3B8' }}>{r.email}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{r.currentTitle ?? '—'}{r.currentCompany ? <span style={{ color: '#94A3B8' }}> · {r.currentCompany}</span> : null}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 230 }}>
                      {r.topSkills.length ? r.topSkills.slice(0, 4).map((s) => { const chip = skillChip(s); return <span key={s} title={chip.full} style={{ fontSize: 10.5, background: '#F1F5F9', color: '#475569', padding: '2px 7px', borderRadius: 100, whiteSpace: 'nowrap' }}>{chip.label}</span> }) : <span style={{ color: '#CBD5E1' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}><span style={{ fontWeight: 800, color: scoreColor(r.bestScore) }}>{r.bestScore ?? '—'}</span></td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{r.source ?? '—'}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 11, fontWeight: 700, color: tone.fg, background: tone.bg, borderRadius: 100, padding: '2px 9px', whiteSpace: 'nowrap' }}>{r.status}</span></td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }} title={r.jobs.map((j) => j.title).join(', ')}>{r.jobsCount || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtDate(r.lastActivityAt)}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
                </tr>
              )
            })}
            {view.length === 0 && !loading && <tr><td colSpan={9} style={{ padding: 36, textAlign: 'center', color: '#94A3B8' }}>No candidates match these filters.</td></tr>}
            {loading && <tr><td colSpan={9} style={{ padding: 36, textAlign: 'center', color: '#94A3B8' }}>Loading talent pool…</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 10 }}>Tip: open a candidate to find & attach them to a new open job (rediscovery).</div>

      {selected && <CandidateSlideOver candidateId={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  )
}
