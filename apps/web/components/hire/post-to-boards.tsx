'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'

interface CredField { key: string; label: string; placeholder?: string }
interface Catalog { provider: string; label: string; authType: string; capabilities: { canPost: boolean; canSearch: boolean }; postingExtraFields: CredField[] }
interface Conn { provider: string; status: string }
interface Posting { provider: string; status: string; postingUrl: string | null; externalRefId: string | null; errorMsg: string | null; postedAt: string | null; lastSyncedAt: string | null }
interface PostResult { provider: string; status: string; url?: string | null; error?: string | null }

const labelOf = (catalog: Catalog[], p: string) => catalog.find((c) => c.provider === p)?.label ?? p

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; bg: string; t: string }> = {
    posted: { c: '#059669', bg: 'rgba(5,150,105,0.10)', t: 'Posted' },
    pending: { c: '#D97706', bg: 'rgba(217,119,6,0.12)', t: 'Pending' },
    failed: { c: '#DC2626', bg: 'rgba(220,38,38,0.10)', t: 'Failed' },
    closed: { c: '#64748B', bg: '#F1F5F9', t: 'Closed' },
  }
  const s = map[status] ?? map.pending
  return <span style={{ fontSize: 11, fontWeight: 700, color: s.c, background: s.bg, borderRadius: 100, padding: '2px 9px' }}>{s.t}</span>
}

export function PostToBoards({ jobId }: { jobId: string }) {
  const [catalog, setCatalog] = useState<Catalog[]>([])
  const [conns, setConns] = useState<Conn[]>([])
  const [postings, setPostings] = useState<Posting[]>([])
  const [open, setOpen] = useState(false)

  const loadBoards = useCallback(() => { fetch('/api/hire/boards').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setCatalog(d.catalog ?? []); setConns(d.connections ?? []) } }).catch(() => {}) }, [])
  const loadPostings = useCallback(() => { fetch(`/api/hire/jobs/${jobId}/postings`).then((r) => (r.ok ? r.json() : null)).then((d) => setPostings(d?.postings ?? [])).catch(() => {}) }, [jobId])
  useEffect(() => { loadBoards(); loadPostings() }, [loadBoards, loadPostings])

  const postable = useMemo(() => catalog.filter((c) => c.capabilities.canPost), [catalog])
  const isConnected = (p: string) => conns.some((c) => c.provider === p && c.status === 'connected')

  async function close(provider: string) {
    if (!confirm(`Close this job's posting on ${labelOf(catalog, provider)}?`)) return
    await fetch(`/api/hire/jobs/${jobId}/postings/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) })
    loadPostings()
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Job boards</div>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Post under your own connected account (BYOB)</span>
        <button onClick={() => setOpen(true)} style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 9, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>📤 Post to boards</button>
      </div>

      {postings.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {postings.map((p) => (
            <div key={p.provider} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #F1F5F9', borderRadius: 10, padding: '10px 12px' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', width: 90 }}>{labelOf(catalog, p.provider)}</span>
              <StatusPill status={p.status} />
              {p.postingUrl && <a href={p.postingUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#6D28D9', fontWeight: 600, textDecoration: 'none' }}>View live →</a>}
              {p.errorMsg && <span style={{ fontSize: 12, color: p.status === 'failed' ? '#DC2626' : '#94A3B8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.errorMsg}>{p.errorMsg}</span>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                {p.status !== 'closed' && <button onClick={() => setOpen(true)} style={ghost}>Update</button>}
                {p.status !== 'closed' && <button onClick={() => close(p.provider)} style={{ ...ghost, color: '#DC2626' }}>Close</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <PostModal jobId={jobId} postable={postable} isConnected={isConnected} onClose={() => setOpen(false)} onDone={() => { setOpen(false); loadPostings() }} />}
    </div>
  )
}

const ghost: React.CSSProperties = { padding: '5px 11px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }

function PostModal({ jobId, postable, isConnected, onClose, onDone }: { jobId: string; postable: Catalog[]; isConnected: (p: string) => boolean; onClose: () => void; onDone: () => void }) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(postable.map((b) => [b.provider, isConnected(b.provider)])))
  const [extra, setExtra] = useState<Record<string, Record<string, string>>>({})
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<PostResult[] | null>(null)

  // Pre-fill any required extra fields (e.g. Naukri industry/role) with AI suggestions.
  useEffect(() => {
    postable.forEach((b) => {
      if (!isConnected(b.provider) || b.postingExtraFields.length === 0) return
      fetch(`/api/hire/jobs/${jobId}/post/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: b.provider }) })
        .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.suggestions) setExtra((prev) => ({ ...prev, [b.provider]: { ...d.suggestions, ...(prev[b.provider] ?? {}) } })) }).catch(() => {})
    })
  }, [postable, jobId, isConnected])

  const chosen = postable.filter((b) => selected[b.provider] && isConnected(b.provider))
  async function post() {
    setBusy(true)
    const res = await fetch(`/api/hire/jobs/${jobId}/post`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providers: chosen.map((b) => b.provider), extra }) })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    setResults(d.results ?? [{ provider: '—', status: 'failed', error: d.error ?? 'Failed' }])
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Post to job boards</div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>Posts under your own connected account. Your board credits are used — never a Levl1 account.</div>

        {!results ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {postable.map((b) => {
              const connected = isConnected(b.provider)
              return (
                <div key={b.provider} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', opacity: connected ? 1 : 0.7 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: connected ? 'pointer' : 'default' }}>
                    <input type="checkbox" disabled={!connected} checked={!!selected[b.provider] && connected} onChange={(e) => setSelected((p) => ({ ...p, [b.provider]: e.target.checked }))} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', flex: 1 }}>{b.label}</span>
                    {connected ? <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Connected</span>
                      : <a href="/hire/settings/integrations" style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9', textDecoration: 'none' }}>Connect →</a>}
                  </label>
                  {connected && selected[b.provider] && b.postingExtraFields.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 26 }}>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{b.label} needs a couple of extra fields (AI-suggested — edit if needed):</div>
                      {b.postingExtraFields.map((f) => (
                        <input key={f.key} style={inp} placeholder={f.placeholder ?? f.label} value={extra[b.provider]?.[f.key] ?? ''} onChange={(e) => setExtra((prev) => ({ ...prev, [b.provider]: { ...(prev[b.provider] ?? {}), [f.key]: e.target.value } }))} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={post} disabled={busy || chosen.length === 0} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: busy || chosen.length === 0 ? '#C4B5FD' : '#6D28D9', color: '#fff', fontWeight: 700, cursor: busy || chosen.length === 0 ? 'default' : 'pointer' }}>{busy ? 'Posting…' : `Post to ${chosen.length || ''} board${chosen.length === 1 ? '' : 's'}`}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((r) => (
              <div key={r.provider} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', flex: 1 }}>{r.provider}</span>
                  <StatusPill status={r.status} />
                </div>
                {r.url && <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#6D28D9', fontWeight: 600, textDecoration: 'none' }}>View live posting →</a>}
                {r.error && <div style={{ fontSize: 12.5, color: r.status === 'failed' ? '#DC2626' : '#B45309', marginTop: 4, lineHeight: 1.5 }}>{r.error}</div>}
              </div>
            ))}
            <button onClick={onDone} style={{ padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
