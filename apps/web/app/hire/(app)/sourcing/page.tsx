'use client'
import { useEffect, useState, useCallback } from 'react'

interface Board { board: string; label: string; tier: string; mode: string; comingSoon: boolean; inbound: 'live' | 'scaffold' | null; connected: boolean; canPull: boolean }
interface Job { id: string; title: string }
interface PostResult { board: string; status: string; externalUrl?: string | null; error?: string; payload?: string }
interface ImportRow { board: string; label: string; pulled: number; imported: number; duplicates: number; note?: string }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const H: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }
const sel: React.CSSProperties = { padding: '8px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, background: '#fff' }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  posted: { label: 'Posted', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  manual_pending: { label: 'Pending — finish on board', color: '#D97706', bg: 'rgba(245,158,11,0.12)' },
  pending: { label: 'Pending', color: '#D97706', bg: 'rgba(245,158,11,0.12)' },
  failed: { label: 'Failed', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
}

export default function SourcingPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState('')
  const [outSel, setOutSel] = useState<Set<string>>(new Set())
  const [inSel, setInSel] = useState<Set<string>>(new Set())
  const [importJobId, setImportJobId] = useState('')
  const [posting, setPosting] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [results, setResults] = useState<PostResult[] | null>(null)
  const [imported, setImported] = useState<{ perBoard: ImportRow[]; totals: { pulled: number; imported: number; duplicates: number } } | null>(null)

  const load = useCallback(() => {
    fetch('/api/hire/sourcing').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return
      setBoards(d.boards); setJobs(d.jobs)
      if (d.jobs[0]) { setJobId((j) => j || d.jobs[0].id) }
      const connected = d.boards.filter((b: Board) => b.connected && !b.comingSoon).map((b: Board) => b.board)
      setOutSel(new Set(connected))
      setInSel(new Set(d.boards.filter((b: Board) => b.connected && b.canPull).map((b: Board) => b.board)))
    }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, board: string) => { const n = new Set(set); n.has(board) ? n.delete(board) : n.add(board); setter(n) }

  async function distribute() {
    if (!jobId || outSel.size === 0) return
    setPosting(true); setResults(null)
    try {
      const res = await fetch('/api/hire/sourcing/distribute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId, boards: Array.from(outSel) }) })
      const d = await res.json(); if (res.ok) setResults(d.results)
    } finally { setPosting(false) }
  }
  async function pull() {
    if (inSel.size === 0) return
    setPulling(true); setImported(null)
    try {
      const res = await fetch('/api/hire/sourcing/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boards: Array.from(inSel), jobId: importJobId || undefined }) })
      const d = await res.json(); if (res.ok) setImported(d)
    } finally { setPulling(false) }
  }

  const postable = boards.filter((b) => !b.comingSoon)
  const pullable = boards.filter((b) => b.canPull && !b.comingSoon)

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Sourcing</h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px' }}>Distribute a role to multiple boards and pull applicants into your pool — from one screen.</p>

      {/* Connected boards */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={H}>Job boards</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {boards.map((b) => (
            <div key={b.board} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '11px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{b.label}</span>
                {b.comingSoon && <span style={{ fontSize: 10, color: '#94A3B8' }}>soon</span>}
              </div>
              <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: b.connected ? '#059669' : '#94A3B8', background: b.connected ? 'rgba(5,150,105,0.1)' : '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>{b.connected ? '● Connected' : 'Not connected'}</span>
                {b.canPull && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.08)', borderRadius: 100, padding: '2px 8px' }}>inbound</span>}
              </div>
            </div>
          ))}
        </div>
        <a href="/hire/settings/job-boards" style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, fontWeight: 600, color: '#6D28D9' }}>Manage connections →</a>
      </div>

      {/* Outbound */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={H}>Distribute a job</div>
        {jobs.length === 0 ? <div style={{ fontSize: 13, color: '#94A3B8' }}>No active jobs to distribute.</div> : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={sel}>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
              <button onClick={distribute} disabled={posting || !jobId || outSel.size === 0} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: posting || outSel.size === 0 ? '#C4B5FD' : '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{posting ? 'Posting…' : `Distribute to ${outSel.size} board${outSel.size === 1 ? '' : 's'}`}</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {postable.map((b) => (
                <button key={b.board} onClick={() => toggle(outSel, setOutSel, b.board)} style={chip(outSel.has(b.board))}>{outSel.has(b.board) ? '✓ ' : ''}{b.label}</button>
              ))}
            </div>
            {results && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map((r) => {
                  const s = STATUS[r.status] ?? STATUS.pending
                  const label = boards.find((b) => b.board === r.board)?.label ?? r.board
                  return (
                    <div key={r.board} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '8px 10px', border: '1px solid #F1F5F9', borderRadius: 8 }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', width: 110 }}>{label}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 100, padding: '2px 10px' }}>{s.label}</span>
                      {r.externalUrl && <a href={r.externalUrl} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#6D28D9' }}>Open ↗</a>}
                      {r.payload && <button onClick={() => navigator.clipboard?.writeText(r.payload!)} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#6D28D9', background: 'none', border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Copy post</button>}
                      {r.error && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#DC2626' }}>{r.error}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Inbound */}
      <div style={card}>
        <div style={H}>Pull candidates in</div>
        {pullable.length === 0 ? <div style={{ fontSize: 13, color: '#94A3B8' }}>No boards with an inbound source connected yet.</div> : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <select value={importJobId} onChange={(e) => setImportJobId(e.target.value)} style={sel}>
                <option value="">Add to pool (no job)</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>Attach to: {j.title}</option>)}
              </select>
              <button onClick={pull} disabled={pulling || inSel.size === 0} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: pulling || inSel.size === 0 ? '#C4B5FD' : '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{pulling ? 'Pulling…' : `Pull from ${inSel.size} board${inSel.size === 1 ? '' : 's'}`}</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pullable.map((b) => <button key={b.board} onClick={() => toggle(inSel, setInSel, b.board)} style={chip(inSel.has(b.board))}>{inSel.has(b.board) ? '✓ ' : ''}{b.label}</button>)}
            </div>
            {imported && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Imported {imported.totals.imported} · {imported.totals.duplicates} duplicate{imported.totals.duplicates === 1 ? '' : 's'} skipped · {imported.totals.pulled} pulled</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {imported.perBoard.map((r) => (
                    <div key={r.board} style={{ fontSize: 13, color: '#475569', display: 'flex', gap: 10, padding: '6px 10px', border: '1px solid #F1F5F9', borderRadius: 8 }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', width: 110 }}>{r.label}</span>
                      <span>{r.imported} imported · {r.duplicates} dup · {r.pulled} pulled{r.note ? ` · ${r.note}` : ''}</span>
                    </div>
                  ))}
                </div>
                <a href="/hire/candidates" style={{ display: 'inline-block', marginTop: 10, fontSize: 12.5, fontWeight: 600, color: '#6D28D9' }}>View candidates →</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function chip(active: boolean): React.CSSProperties {
  return { fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 100, cursor: 'pointer', border: '1px solid ' + (active ? '#6D28D9' : '#E2E8F0'), background: active ? 'rgba(109,40,217,0.08)' : '#fff', color: active ? '#6D28D9' : '#64748B' }
}
