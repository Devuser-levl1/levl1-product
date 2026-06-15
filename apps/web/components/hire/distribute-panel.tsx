'use client'
import { useEffect, useState, useCallback } from 'react'

interface BoardRow {
  board: string
  label: string
  tier: 'A' | 'B'
  mode: 'api' | 'assisted'
  comingSoon: boolean
  connected: boolean
  posting: { id: string; status: string; externalUrl: string | null; postedAt: string | null; error: string | null } | null
}
interface PostResult { board: string; postingId?: string; status: string; externalUrl?: string; error?: string; payload?: string }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const btn: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const ghost: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }

function statusPill(status: string) {
  const map: Record<string, [string, string, string]> = {
    posted: ['Posted ✓', '#059669', 'rgba(5,150,105,0.1)'],
    manual_pending: ['Manual pending', '#D97706', 'rgba(245,158,11,0.12)'],
    failed: ['Failed', '#DC2626', 'rgba(220,38,38,0.08)'],
    expired: ['Expired', '#94A3B8', '#F1F5F9'],
    pending: ['Pending', '#64748B', '#F1F5F9'],
  }
  const [label, color, bg] = map[status] ?? [status, '#64748B', '#F1F5F9']
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 100, padding: '3px 10px' }}>{label}</span>
}

export function DistributePanel({ jobId }: { jobId: string }) {
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [posting, setPosting] = useState(false)
  const [results, setResults] = useState<PostResult[]>([])

  const load = useCallback(() => {
    fetch(`/api/hire/jobs/${jobId}/distribution`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.boards) setBoards(d.boards) }).catch(() => {})
  }, [jobId])
  useEffect(() => { load() }, [load])

  const toggle = (board: string) => setSelected((p) => { const n = new Set(p); n.has(board) ? n.delete(board) : n.add(board); return n })

  async function post() {
    if (selected.size === 0) return
    setPosting(true); setResults([])
    try {
      const res = await fetch(`/api/hire/jobs/${jobId}/distribution`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boards: Array.from(selected) }) })
      const d = await res.json()
      if (d?.results) setResults(d.results)
      setSelected(new Set())
      load()
    } finally { setPosting(false) }
  }

  async function markPosted(postingId: string) {
    const url = prompt('Optional: paste the live job URL from the board (or leave blank).') ?? ''
    await fetch(`/api/hire/jobs/${jobId}/distribution/${postingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'posted', externalUrl: url || undefined }) })
    load()
  }
  async function expire(postingId: string) {
    if (!confirm('Expire this posting?')) return
    await fetch(`/api/hire/jobs/${jobId}/distribution/${postingId}`, { method: 'DELETE' })
    load()
  }

  const connectable = boards.filter((b) => !b.comingSoon)
  const comingSoon = boards.filter((b) => b.comingSoon)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Distribute to job boards</div>
        <div style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 14 }}>Select connected boards and post. API-mode boards post live; assisted boards give you a ready-to-paste payload + deep link.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {connectable.map((b) => (
            <label key={b.board} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 10, cursor: b.connected ? 'pointer' : 'default', opacity: b.connected ? 1 : 0.6 }}>
              <input type="checkbox" disabled={!b.connected} checked={selected.has(b.board)} onChange={() => toggle(b.board)} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{b.label}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>{b.mode === 'api' ? 'API' : 'Assisted'}</span>
              {!b.connected && <span style={{ fontSize: 11.5, color: '#94A3B8' }}>not connected — <a href="/hire/settings/job-boards" style={{ color: '#4F46E5' }}>connect</a></span>}
              <span style={{ marginLeft: 'auto' }}>{b.posting && statusPill(b.posting.status)}</span>
            </label>
          ))}
        </div>

        {comingSoon.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {comingSoon.map((b) => (
              <span key={b.board} style={{ fontSize: 11.5, fontWeight: 600, color: '#94A3B8', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 100, padding: '4px 12px' }}>{b.label} · coming soon</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button onClick={post} disabled={posting || selected.size === 0} style={{ ...btn, opacity: selected.size === 0 ? 0.5 : 1 }}>{posting ? 'Posting…' : `Post to selected (${selected.size})`}</button>
        </div>
      </div>

      {results.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Results</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((r) => (
              <div key={r.board} style={{ borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, textTransform: 'capitalize' }}>{r.board}</span>
                  {statusPill(r.status)}
                  {r.externalUrl && <a href={r.externalUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#4F46E5', marginLeft: 'auto' }}>Open board →</a>}
                </div>
                {r.error && <div style={{ fontSize: 12.5, color: '#DC2626', marginTop: 4 }}>{r.error}</div>}
                {r.payload && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Ready-to-paste job post:</div>
                    <textarea readOnly value={r.payload} style={{ width: '100%', boxSizing: 'border-box', minHeight: 110, fontSize: 12, fontFamily: 'monospace', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }} />
                    <button onClick={() => navigator.clipboard.writeText(r.payload!)} style={{ ...ghost, marginTop: 6 }}>Copy payload</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Current postings</div>
        {boards.filter((b) => b.posting).length === 0 ? (
          <div style={{ fontSize: 13, color: '#94A3B8' }}>Not posted to any board yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {boards.filter((b) => b.posting).map((b) => (
              <div key={b.board} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{b.label}</span>
                {statusPill(b.posting!.status)}
                {b.posting!.externalUrl && <a href={b.posting!.externalUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#4F46E5' }}>View →</a>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {b.posting!.status === 'manual_pending' && <button onClick={() => markPosted(b.posting!.id)} style={ghost}>Mark as posted</button>}
                  {b.posting!.status !== 'expired' && <button onClick={() => expire(b.posting!.id)} style={{ ...ghost, color: '#DC2626' }}>Expire</button>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
