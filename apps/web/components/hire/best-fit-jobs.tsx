'use client'
import { useState } from 'react'

interface JobMatch { jobId: string; title: string; score: number; verdict: string; reasons: string[]; matchedSkills: string[]; missingSkills: string[] }
const vColor = (v: string) => (v === 'strong' ? '#059669' : v === 'good' ? '#6D28D9' : v === 'partial' ? '#D97706' : '#64748B')

// Candidate slide-over widget: rank the candidate's best-fit OPEN jobs.
export function BestFitJobs({ candidateId, onAttached }: { candidateId: string; onAttached: () => void }) {
  const [matches, setMatches] = useState<JobMatch[] | null>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [attaching, setAttaching] = useState<string | null>(null)

  async function find() {
    setBusy(true); setNote('')
    try {
      const res = await fetch(`/api/hire/candidates/${candidateId}/match-jobs`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) { setMatches(d.matches ?? []); setCurrentJobId(d.currentJobId ?? null); if (d.note) setNote(d.note) }
      else setNote(d.error ?? 'Could not match')
    } finally { setBusy(false) }
  }
  async function attach(jobId: string) {
    setAttaching(jobId)
    try {
      await fetch(`/api/hire/candidates/${candidateId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId, currentStage: 'Sourced' }) })
      setCurrentJobId(jobId); onAttached()
    } finally { setAttaching(null) }
  }

  return (
    <div>
      {!matches ? (
        <button onClick={find} disabled={busy} style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #6D28D9', background: busy ? 'rgba(109,40,217,0.06)' : '#fff', color: '#6D28D9', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? '✨ Matching to open jobs…' : '✨ Find best-fit jobs'}
        </button>
      ) : matches.length === 0 ? (
        <div style={{ fontSize: 12.5, color: '#94A3B8' }}>{note || 'No matching open jobs.'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {matches.map((m) => (
            <div key={m.jobId} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: vColor(m.verdict) }}>{m.score}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                {currentJobId === m.jobId
                  ? <span style={{ fontSize: 11, color: '#94A3B8' }}>Current</span>
                  : <button onClick={() => attach(m.jobId)} disabled={attaching === m.jobId} style={{ fontSize: 11.5, fontWeight: 700, color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer' }}>{attaching === m.jobId ? '…' : 'Attach →'}</button>}
              </div>
              {m.reasons[0] && <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>{m.reasons[0]}</div>}
              {(m.matchedSkills.length > 0 || m.missingSkills.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {m.matchedSkills.slice(0, 5).map((s) => <span key={'m' + s} style={{ fontSize: 10, color: '#059669' }}>✓{s}</span>)}
                  {m.missingSkills.slice(0, 3).map((s) => <span key={'x' + s} style={{ fontSize: 10, color: '#B45309' }}>✗{s}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
