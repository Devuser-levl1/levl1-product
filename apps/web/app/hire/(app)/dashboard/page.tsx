'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Dash { pipeline: { openTotal: number; openCount: number; byStage: Record<string, number>; wonMtd: number }; recent: { kind: string; text: string; at: string }[]; upcoming: { id: string; candidateName: string; jobTitle: string | null; type: string; at: string }[]; gettingStarted?: { job: boolean; candidate: boolean; interview: boolean; teammate: boolean } }
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }

interface Ana { summary: { totalCandidates: number; avgAiScore: number | null }; funnel: { name: string; count: number }[] }
interface TopMatch { candidateId: string; candidateName: string; candidateTitle: string | null; jobId: string; jobTitle: string; score: number; verdict: string; reason: string | null }
const mColor = (v: string) => (v === 'strong' ? '#059669' : v === 'good' ? '#6D28D9' : v === 'partial' ? '#D97706' : '#64748B')

export default function HireDashboard() {
  const router = useRouter()
  const [d, setD] = useState<Dash | null>(null)
  const [week, setWeek] = useState<Ana | null>(null)
  const [pipe, setPipe] = useState<Ana | null>(null)
  const [topMatches, setTopMatches] = useState<TopMatch[]>([])
  useEffect(() => { fetch('/api/hire/dashboard').then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/hire/matches/top').then((r) => (r.ok ? r.json() : null)).then((x) => setTopMatches(x?.matches ?? [])).catch(() => {}) }, [])
  useEffect(() => {
    const from7 = new Date(Date.now() - 7 * 86400000).toISOString()
    const to = new Date().toISOString()
    fetch(`/api/hire/analytics?from=${from7}&to=${to}`).then((r) => (r.ok ? r.json() : null)).then(setWeek).catch(() => {})
    fetch(`/api/hire/analytics?from=${new Date(Date.now() - 365 * 86400000).toISOString()}&to=${to}`).then((r) => (r.ok ? r.json() : null)).then(setPipe).catch(() => {})
  }, [])

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 18px' }}>Dashboard</h1>

      {d?.gettingStarted && !(d.gettingStarted.job && d.gettingStarted.candidate && d.gettingStarted.interview && d.gettingStarted.teammate) && (
        <div style={{ ...card, marginBottom: 16, borderLeft: '3px solid #6D28D9' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Getting started</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {([['job', 'Create your first job', '/hire/jobs/new'], ['candidate', 'Add your first candidate', '/hire/candidates'], ['interview', 'Schedule your first interview', '/hire/candidates'], ['teammate', 'Invite a teammate', '/hire/settings']] as const).map(([k, label, href]) => {
              const done = d.gettingStarted![k]
              return <a key={k} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, textDecoration: 'none', color: done ? '#475569' : '#334155' }}><span style={{ color: done ? '#10B981' : '#64748B' }}>{done ? '✓' : '○'}</span>{label}</a>
            })}
          </div>
        </div>
      )}

      {topMatches.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>✨ Top AI-matched candidates</div>
            <span style={{ fontSize: 11.5, color: '#94A3B8', marginLeft: 8 }}>across your open jobs</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topMatches.map((m) => (
              <div key={m.candidateId + m.jobId} onClick={() => router.push(`/hire/jobs/${m.jobId}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid #F1F5F9', borderRadius: 10, cursor: 'pointer' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: mColor(m.verdict), width: 30 }}>{m.score}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{m.candidateName} <span style={{ fontWeight: 500, color: '#94A3B8' }}>→ {m.jobTitle}</span></div>
                  {m.reason && <div style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.reason}</div>}
                </div>
                <span style={{ fontSize: 16, color: '#CBD5E1' }}>›</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics mini-widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pipeline health</div>
            <button onClick={() => router.push('/hire/analytics')} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer' }}>Analytics →</button>
          </div>
          {!pipe || pipe.summary.totalCandidates === 0 ? <div style={{ fontSize: 13, color: '#64748B' }}>No candidates yet.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pipe.funnel.map((f, i) => { const max = Math.max(...pipe.funnel.map((x) => x.count), 1); return (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748B', width: 72 }}>{f.name}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}><div style={{ width: `${(f.count / max) * 100}%`, height: '100%', background: `hsl(${250 - i * 24} 80% 60%)` }} /></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', width: 24, textAlign: 'right' }}>{f.count}</span>
                </div>
              ) })}
            </div>
          )}
        </div>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>This week</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div><div style={{ fontSize: 24, fontWeight: 800 }}>{week ? week.summary.totalCandidates : '—'}</div><div style={{ fontSize: 12, color: '#475569' }}>candidates added</div></div>
            <div><div style={{ fontSize: 24, fontWeight: 800 }}>{week?.summary.avgAiScore ?? '—'}</div><div style={{ fontSize: 12, color: '#475569' }}>avg AI score</div></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Open Pipeline</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{d ? inr(d.pipeline.openTotal) : '—'}</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{d ? `across ${d.pipeline.openCount} deals` : ''}</div>
          {d && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
              {Object.entries(d.pipeline.byStage).map(([s, n]) => `${s}: ${n}`).join('  ·  ') || 'No open deals'}
            </div>
          )}
          <button onClick={() => router.push('/hire/crm')} style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View Pipeline →</button>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Won (this month)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{d ? inr(d.pipeline.wonMtd) : '—'}</div>
        </div>
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upcoming Interviews</div>
          <button onClick={() => router.push('/hire/interviews')} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
        </div>
        {!d || d.upcoming.length === 0 ? <div style={{ fontSize: 13, color: '#475569' }}>No upcoming interviews.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.upcoming.map((u) => (
              <div key={u.id} style={{ fontSize: 13, color: '#475569' }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{new Date(u.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</span> · {u.candidateName} · {u.type}{u.jobTitle ? ` · ${u.jobTitle}` : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Recent Activity</div>
        {!d || d.recent.length === 0 ? <div style={{ fontSize: 13, color: '#475569' }}>No recent activity.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.recent.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: '#475569' }}>
                <span style={{ color: '#64748B', marginRight: 6 }}>•</span>{r.text}
                <span style={{ color: '#64748B', fontSize: 11, marginLeft: 6 }}>{new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
