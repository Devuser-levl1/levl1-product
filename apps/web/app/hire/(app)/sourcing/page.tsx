'use client'
import { useEffect, useState, useCallback } from 'react'
import { SOURCING_BOARDS, getSourcingBoard } from '@/lib/hire/sourcing-boards'

interface Job { id: string; title: string }
interface BoardStrings { key: string; label: string; boolean: string; filters: string[] }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const sel: React.CSSProperties = { padding: '8px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, background: '#fff' }
const btn: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }
const ghost: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }

// Indeed first, then the other boards we have a search template for.
const ORDER = SOURCING_BOARDS.map((b) => b.key)

export default function SourcingPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [strings, setStrings] = useState<BoardStrings[] | null>(null)
  const [location, setLocation] = useState('')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const loadJobs = useCallback(() => {
    fetch('/api/hire/jobs').then((r) => (r.ok ? r.json() : [])).then((d) => {
      const list: Job[] = Array.isArray(d) ? d.map((j: { id: string; title: string }) => ({ id: j.id, title: j.title })) : []
      setJobs(list)
      if (list[0]) setJobId((j) => j || list[0].id)
    }).catch(() => {})
  }, [])
  useEffect(() => { loadJobs() }, [loadJobs])

  async function generate() {
    if (!jobId) return
    setLoading(true); setErr(''); setStrings(null)
    try {
      const res = await fetch(`/api/hire/jobs/${jobId}/search-strings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Could not generate search strings'); return }
      // Only boards we have a sourcing template/extension matcher for, Indeed first.
      const supported: BoardStrings[] = (d.boards ?? []).filter((b: BoardStrings) => getSourcingBoard(b.key))
      supported.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))
      setStrings(supported)
      setLocation(d.inputs?.location ?? '')
    } finally { setLoading(false) }
  }

  function copy(key: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500) }).catch(() => {})
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Sourcing</h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 12px' }}>Generate a board-optimized search for a role, open the board pre-filled, and capture the profiles you choose with the Levl1 browser extension — one at a time.</p>
      <div style={{ fontSize: 12.5, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', marginBottom: 20 }}>
        Sourcing is <strong>recruiter-driven</strong>: you choose each candidate. Levl1 does not scrape or bulk-pull from boards — the extension captures only the profile you&apos;re viewing, under your own board login. <a href="/hire/settings/sourcing-extension" style={{ color: '#6D28D9', fontWeight: 700 }}>Install the capture extension →</a>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={jobId} onChange={(e) => { setJobId(e.target.value); setStrings(null) }} style={sel}>
            {jobs.length === 0 && <option value="">No active jobs</option>}
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <button onClick={generate} disabled={loading || !jobId} style={{ ...btn, opacity: loading || !jobId ? 0.6 : 1 }}>{loading ? 'Generating…' : 'Generate search strings'}</button>
        </div>
        {err && <div style={{ fontSize: 13, color: '#DC2626', marginTop: 10 }}>{err}</div>}
      </div>

      {strings && strings.map((b) => {
        const board = getSourcingBoard(b.key)!
        return (
          <div key={b.key} style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{b.label}</span>
              {!board.captureReady && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', background: '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>capture coming soon</span>}
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Search string</div>
            <textarea readOnly value={b.boolean} style={{ width: '100%', boxSizing: 'border-box', minHeight: 64, fontSize: 12.5, fontFamily: 'monospace', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }} />
            {b.filters.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {b.filters.map((f, i) => <span key={i} style={{ fontSize: 11.5, color: '#475569', background: '#F1F5F9', borderRadius: 100, padding: '3px 10px' }}>{f}</span>)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button onClick={() => copy(b.key, b.boolean)} style={btn}>{copied === b.key ? 'Copied ✓' : 'Copy search string'}</button>
              <a href={board.searchUrl(b.boolean, location)} target="_blank" rel="noreferrer" style={{ ...ghost, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Search on {b.label} →</a>
            </div>

            <div style={{ fontSize: 12, color: '#64748B', marginTop: 10, lineHeight: 1.5 }}>
              Browse the results on {b.label} (your own login). On a profile you want, click the <strong>Levl1 extension</strong> to capture it — it&apos;s parsed, scored against this role, de-duplicated, tagged <strong>{b.label}</strong>, and added to the pipeline. {board.captureReady ? '' : 'Extension capture for this board is coming soon.'}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Capture works on: {board.captureHint}</div>
          </div>
        )
      })}

      {strings && strings.length === 0 && <div style={{ ...card, fontSize: 13, color: '#64748B' }}>No supported boards in the generated strings.</div>}
    </div>
  )
}
