'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Shell, SectionTitle, Card, StatusBadge } from '../../ui'

// Review one sandbox run: transcript, facts the engine was seeded with,
// logistics / culture-fit results, integrity summary and the generated report.
// Everything stays inside the sandbox.

interface Line { speaker: 'ai' | 'candidate'; text: string; timestamp?: string; segment?: string }
interface Detail {
  id: string; status: string; startedAt: string | null; completedAt: string | null; terminationReason: string | null
  config: { label?: string; facts?: Record<string, unknown>; length?: string; voice?: string } | null
  position: { title: string; company: string }; candidate: { name: string }
  transcript: Line[]; logistics: { result: unknown; hardMismatch: boolean } | null; cultureFit: { fitScore: number; summary: string } | null
  integrity: { totalEvents: number; totalFlags: number; reviewStatus: string }
  report: { overallScore: number; recommendation: string } | null; reportStatus: string | null; reportError: string | null
}

const box: React.CSSProperties = { padding: 16, fontSize: 13, lineHeight: 1.6 }

export default function SandboxRunPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [d, setD] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => fetch(`/api/admin/sandbox/${id}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then(setD).catch(() => setError('Run not found (sandbox runs are deleted after 24 hours).')), [id])
  useEffect(() => { void load() }, [load])
  // The report generates for about a minute after the run — keep polling until it's there.
  useEffect(() => {
    if (!d || d.report || d.status !== 'completed') return
    const t = setTimeout(() => { void load() }, 8000)
    return () => clearTimeout(t)
  }, [d, load])

  async function signOut() { await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {}); router.push('/admin/login'); router.refresh() }
  async function remove() { await fetch(`/api/admin/sandbox/${id}`, { method: 'DELETE' }).catch(() => {}); router.push('/admin/interview-sandbox') }

  return (
    <Shell onSignOut={signOut}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <Link href="/admin/interview-sandbox" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>← Sandbox</Link>
        <span style={{ fontSize: 12, color: '#FBBF24', fontWeight: 700 }}>SANDBOX / TEST — not a real interview</span>
      </div>
      {error && <Card><div style={box}>{error}</div></Card>}
      {d && (
        <>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '6px 0 4px' }}>{d.config?.label ?? d.position.title}</h1>
          <div style={{ fontSize: 13, color: '#94A3B8', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={d.status} /> {d.candidate.name} · {d.config?.length === 'full' ? 'full length' : 'short run'} · voice {d.config?.voice}
            {d.terminationReason && <span>· ended: {d.terminationReason}</span>}
            <Link href={`/interview/${d.id}`} style={{ color: '#A5B4FC', textDecoration: 'none' }}>Open room</Link>
            <button onClick={remove} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: 13, padding: 0 }}>Delete run</button>
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 18 }}>
            <Card><div style={box}><div style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase' }}>Report</div>
              {d.report ? <>Score <strong style={{ color: '#fff' }}>{d.report.overallScore}</strong> · {d.report.recommendation}<div><a href={`/report/${d.id}?demo=1`} target="_blank" rel="noopener noreferrer" style={{ color: '#A5B4FC' }}>Open full report</a></div></>
                : d.status === 'completed' ? <>Generating… {d.reportError && <span style={{ color: '#FCA5A5' }}>({d.reportError})</span>}</> : 'After the run'}
            </div></Card>
            <Card><div style={box}><div style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase' }}>Integrity (review only)</div>
              {d.integrity.totalEvents} events · {d.integrity.totalFlags} flags · {d.integrity.reviewStatus}
            </div></Card>
            <Card><div style={box}><div style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase' }}>Seeded facts</div>
              {d.config?.facts && Object.keys(d.config.facts).length ? Object.entries(d.config.facts).map(([k, v]) => <div key={k}>{k}: {String(v)}</div>) : 'None'}
            </div></Card>
          </div>

          {(d.logistics || d.cultureFit) && <SectionTitle>Logistics and culture fit</SectionTitle>}
          {d.logistics && <Card><pre style={{ ...box, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>{JSON.stringify(d.logistics.result, null, 2)}</pre></Card>}
          {d.cultureFit && <div style={{ marginTop: 10 }}><Card><div style={box}>Culture fit {d.cultureFit.fitScore}/100 · {d.cultureFit.summary}</div></Card></div>}

          <SectionTitle>Transcript</SectionTitle>
          <Card>
            <div style={{ ...box, display: 'grid', gap: 10 }}>
              {d.transcript.length === 0 && <span style={{ color: '#64748B' }}>No transcript yet.</span>}
              {d.transcript.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 10 }}>
                  <span style={{ color: l.speaker === 'ai' ? '#A5B4FC' : '#6EE7B7', fontWeight: 700, fontSize: 12 }}>{l.speaker === 'ai' ? 'Interviewer' : 'Candidate'}{l.segment ? <span style={{ display: 'block', color: '#64748B', fontWeight: 400 }}>{l.segment}</span> : null}</span>
                  <span style={{ color: '#E2E8F0' }}>{l.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </Shell>
  )
}
