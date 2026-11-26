'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shell, SectionTitle, Card, Table, Td, StatusBadge, ago } from '../ui'

// ── Interview Test Sandbox (admin only) ────────────────────────────────────
// One click to run the REAL interviewer (same room, engine, prompts, voice)
// against throwaway data that no real view, report, metric or queue can see.

interface Run { id: string; status: string; createdAt: string; completedAt: string | null; terminationReason: string | null; label: string; candidate: string; reportReady: boolean; reportStatus: string | null }
interface Meta { enabled: boolean; presets?: { slug: string; title: string }[]; positions?: { id: string; title: string; company: string; agency: string }[]; voices?: { key: string; label: string }[]; defaultVoice?: string; runs?: Run[] }

const field: React.CSSProperties = { width: '100%', background: '#0B1120', color: '#E2E8F0', border: '1px solid #1F2937', borderRadius: 8, padding: '8px 10px', fontSize: 13 }
const lbl: React.CSSProperties = { display: 'grid', gap: 5, fontSize: 12, color: '#94A3B8' }

export default function InterviewSandboxPage() {
  const router = useRouter()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [source, setSource] = useState('persona:backend-engineer')
  const [name, setName] = useState('Test Candidate')
  const [location, setLocation] = useState('')
  const [years, setYears] = useState('')
  const [notice, setNotice] = useState('')
  const [length, setLength] = useState<'short' | 'full'>('short')
  const [voice, setVoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => fetch('/api/admin/sandbox', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((d: Meta) => { setMeta(d); if (d.defaultVoice) setVoice((v) => v || d.defaultVoice!) }).catch(() => setError('Couldn\'t load the sandbox.'))
  useEffect(() => { void load() }, [])

  async function start() {
    setBusy(true); setError(null)
    const [type, id] = source.split(':')
    try {
      const r = await fetch('/api/admin/sandbox', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: type === 'position' ? { type, id } : { type: 'persona', slug: id }, name, location, yearsExperience: years, noticePeriod: notice, length, voice }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Couldn\'t start the run.')
      router.push(d.url)
    } catch (e) { setError(e instanceof Error ? e.message : 'Couldn\'t start the run.'); setBusy(false) }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/sandbox/${id}`, { method: 'DELETE' }).catch(() => {})
    void load()
  }

  async function signOut() { await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {}); router.push('/admin/login'); router.refresh() }

  return (
    <Shell onSignOut={signOut}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>Interview Sandbox</h1>
        <span style={{ fontSize: 12, color: '#FBBF24', fontWeight: 700 }}>SANDBOX / TEST — nothing here reaches a real candidate, hiring team, report or metric</span>
      </div>
      <p style={{ fontSize: 13, color: '#94A3B8', margin: '8px 0 20px', maxWidth: 760, lineHeight: 1.6 }}>
        Runs the real interviewer (same room, engine, prompts, voice pipeline, turn-taking and integrity signals) on throwaway data.
        Runs are deleted automatically after 24 hours.
      </p>

      {meta && !meta.enabled && <Card><div style={{ padding: 18, fontSize: 13 }}>The sandbox is turned off (INTERVIEW_SANDBOX_ENABLED=0).</div></Card>}

      {meta?.enabled && (
        <Card>
          <div style={{ padding: 18, display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <label style={lbl}>Role / rubric
                <select style={field} value={source} onChange={(e) => setSource(e.target.value)}>
                  <optgroup label="Preset roles (generic)">
                    {meta.presets?.map((p) => <option key={p.slug} value={`persona:${p.slug}`}>{p.title}</option>)}
                  </optgroup>
                  {!!meta.positions?.length && (
                    <optgroup label="Copy of a real role (read-only source)">
                      {meta.positions.map((p) => <option key={p.id} value={`position:${p.id}`}>{p.title} · {p.company}{p.agency ? ` (${p.agency})` : ''}</option>)}
                    </optgroup>
                  )}
                </select>
              </label>
              <label style={lbl}>Length
                <select style={field} value={length} onChange={(e) => setLength(e.target.value as 'short' | 'full')}>
                  <option value="short">Short run (about 3 questions, no work sample)</option>
                  <option value="full">Full length (production)</option>
                </select>
              </label>
              <label style={lbl}>Interviewer voice
                <select style={field} value={voice} onChange={(e) => setVoice(e.target.value)}>
                  {meta.voices?.map((v) => <option key={v.key} value={v.key}>{v.label}{v.key === meta.defaultVoice ? ' (production default)' : ''}</option>)}
                </select>
              </label>
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Candidate context (optional). Seeds the same candidate-facts state a real interview builds, e.g. to reproduce the location / relocation logic.</div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <label style={lbl}>Name<input style={field} value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label style={lbl}>Current location<input style={field} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bengaluru" /></label>
              <label style={lbl}>Years of experience<input style={field} value={years} onChange={(e) => setYears(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="e.g. 5" /></label>
              <label style={lbl}>Notice period<input style={field} value={notice} onChange={(e) => setNotice(e.target.value)} placeholder="e.g. 60 days" /></label>
            </div>
            {error && <div style={{ fontSize: 13, color: '#FCA5A5' }}>{error}</div>}
            <div>
              <button onClick={start} disabled={busy} style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Starting…' : 'Start sandbox interview'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {meta?.enabled && (
        <>
          <SectionTitle>Recent runs</SectionTitle>
          <Card>
            <Table head={['Run', 'Candidate', 'Status', 'Report', 'Started', '']}>
              {(meta.runs ?? []).length === 0 && <tr><Td colSpan={6}><span style={{ color: '#64748B' }}>No runs yet.</span></Td></tr>}
              {(meta.runs ?? []).map((r) => (
                <tr key={r.id}>
                  <Td><Link href={`/admin/interview-sandbox/${r.id}`} style={{ color: '#A5B4FC', textDecoration: 'none' }}>{r.label}</Link></Td>
                  <Td>{r.candidate}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>{r.reportReady ? 'Ready' : r.reportStatus ?? '—'}</Td>
                  <Td>{ago(r.createdAt)}</Td>
                  <Td>
                    <span style={{ display: 'flex', gap: 10 }}>
                      {r.status !== 'completed' && <Link href={`/interview/${r.id}`} style={{ color: '#A5B4FC', textDecoration: 'none' }}>Open room</Link>}
                      <button onClick={() => remove(r.id)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: 13, padding: 0 }}>Delete</button>
                    </span>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </Shell>
  )
}
