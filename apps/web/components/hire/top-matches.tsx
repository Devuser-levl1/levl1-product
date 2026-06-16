'use client'
import { useEffect, useState, useCallback } from 'react'

interface Match {
  candidateId: string; name: string; currentTitle: string | null; currentCompany: string | null
  inThisJob: boolean; currentStage: string; aiScore: number | null
  score: number; verdict: string; reasons: string[]; matchedSkills: string[]; missingSkills: string[]
}

const VERD: Record<string, { label: string; color: string; bg: string }> = {
  strong: { label: 'Strong fit', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  good: { label: 'Good fit', color: '#6D28D9', bg: 'rgba(109,40,217,0.1)' },
  partial: { label: 'Partial fit', color: '#D97706', bg: 'rgba(245,158,11,0.12)' },
  weak: { label: 'Weak fit', color: '#64748B', bg: '#F1F5F9' },
}
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }

export function TopMatches({ jobId, jobTitle, onChanged }: { jobId: string; jobTitle: string; onChanged?: () => void }) {
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [computed, setComputed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState<string | null>(null)

  const loadCached = useCallback(() => {
    fetch(`/api/hire/jobs/${jobId}/matches`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setMatches(d.matches); setComputed(d.computed) } }).catch(() => {})
  }, [jobId])
  useEffect(() => { loadCached() }, [loadCached])

  async function compute(refresh: boolean) {
    setBusy(true)
    try {
      const res = await fetch(`/api/hire/jobs/${jobId}/match-candidates${refresh ? '?refresh=true' : ''}`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) { setMatches(d.matches ?? []); setComputed(true) }
    } finally { setBusy(false) }
  }

  async function addToPipeline(m: Match) {
    setAdding(m.candidateId)
    try {
      await fetch(`/api/hire/candidates/${m.candidateId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId, currentStage: 'Sourced' }) })
      loadCached(); onChanged?.()
    } finally { setAdding(null) }
  }

  const shown = (matches ?? []).filter((m) => filter === 'all' || m.verdict === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>✨ Top AI matches</h2>
          <p style={{ fontSize: 12.5, color: '#64748B', margin: '2px 0 0' }}>Best-fit candidates from your pool for <strong>{jobTitle}</strong> — with reasons.</p>
        </div>
        <button onClick={() => compute(computed)} disabled={busy} style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 9, border: 'none', background: busy ? '#A78BFA' : '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Matching…' : computed ? '↻ Refresh' : '✨ Find matches'}
        </button>
      </div>

      {computed && (matches?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'strong', 'good', 'partial', 'weak'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 100, border: '1px solid ' + (filter === f ? '#6D28D9' : '#E2E8F0'), background: filter === f ? 'rgba(109,40,217,0.08)' : '#fff', color: filter === f ? '#6D28D9' : '#64748B', cursor: 'pointer', textTransform: 'capitalize' }}>{f}{f !== 'all' && matches ? ` (${matches.filter((m) => m.verdict === f).length})` : ''}</button>
          ))}
        </div>
      )}

      {busy && !matches?.length ? (
        <div style={{ ...card, color: '#6D28D9', fontSize: 13, fontWeight: 600 }}>✨ Levl1 AI is ranking your candidate pool against this role…</div>
      ) : !computed ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#475569' }}>Find the best-fit candidates</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, maxWidth: 380, marginInline: 'auto' }}>AI ranks your pool against this role&apos;s must-have skills and screening criteria — and explains why each fits.</div>
        </div>
      ) : shown.length === 0 ? (
        <div style={{ ...card, color: '#94A3B8', fontSize: 13 }}>No candidates in this band.</div>
      ) : shown.map((m, i) => {
        const v = VERD[m.verdict] ?? VERD.weak
        return (
          <div key={m.candidateId} style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#CBD5E1', width: 24, paddingTop: 2 }}>#{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{m.name}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: v.color }}>{m.score}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: v.color, background: v.bg, borderRadius: 100, padding: '2px 10px' }}>{v.label}</span>
                  {m.inThisJob && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>In pipeline · {m.currentStage}</span>}
                </div>
                {(m.currentTitle || m.currentCompany) && <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>{[m.currentTitle, m.currentCompany].filter(Boolean).join(' · ')}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {m.matchedSkills.map((s) => <span key={'m' + s} style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 100, padding: '2px 9px' }}>✓ {s}</span>)}
                  {m.missingSkills.map((s) => <span key={'x' + s} style={{ fontSize: 11, fontWeight: 600, color: '#B45309', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 100, padding: '2px 9px' }}>✗ {s}</span>)}
                </div>
                {m.reasons.length > 0 && <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>{m.reasons.map((r, ri) => <li key={ri}>{r}</li>)}</ul>}
              </div>
              <div style={{ flexShrink: 0 }}>
                {m.inThisJob ? <span style={{ fontSize: 12, color: '#94A3B8' }}>Added</span>
                  : <button onClick={() => addToPipeline(m)} disabled={adding === m.candidateId} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #6D28D9', background: '#fff', color: '#6D28D9', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>{adding === m.candidateId ? '…' : '+ Add to pipeline'}</button>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
