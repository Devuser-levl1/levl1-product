'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Home {
  isEmpty: boolean
  gettingStarted: { job: boolean; candidate: boolean; teammate: boolean }
  todaysActions: { awaitingReview: number; interviewsToSchedule: number; jobsNeedAttention: number }
  funnel: { name: string; count: number }[]
  topMatches: { candidateId: string; candidateName: string; candidateTitle: string | null; jobId: string; jobTitle: string; score: number; verdict: string; reason: string | null }[]
  velocity: { avgTimeToShortlist: number | null; candidatesThisWeek: number; interviewsRun: number }
  recent: { id: string; text: string; at: string }[]
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 22 }
const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }
const mColor = (v: string) => (v === 'strong' ? '#059669' : v === 'good' ? '#6D28D9' : v === 'partial' ? '#D97706' : '#64748B')
const funnelColor = (i: number) => `hsl(${252 - i * 20} 75% 60%)`

export default function HireDashboard() {
  const router = useRouter()
  const [h, setH] = useState<Home | null>(null)
  const [name, setName] = useState<string>('')
  const [pool, setPool] = useState<{ total: number; addedThisMonth: number; addedPrevMonth: number; bySource: { source: string; count: number }[] } | null>(null)

  useEffect(() => { fetch('/api/hire/dashboard/home').then((r) => (r.ok ? r.json() : null)).then(setH).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/hire/talent-pool/stats').then((r) => (r.ok ? r.json() : null)).then(setPool).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => setName(d?.user?.name?.split(' ')[0] ?? '')).catch(() => {}) }, [])

  const greeting = (() => { const hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening' })()
  const go = (href: string) => () => router.push(href)

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{greeting}{name ? `, ${name}` : ''}.</h1>
      <div style={{ fontSize: 15, color: '#64748B', marginBottom: 22 }}>Here&apos;s what needs you today.</div>

      {h?.isEmpty ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🚀</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Create your first job to get started</div>
          <div style={{ fontSize: 14, color: '#64748B', marginTop: 6, maxWidth: 420, marginInline: 'auto' }}>Post a role, let AI write the brief, then source and rank candidates — all in one calm workspace.</div>
          <button onClick={go('/hire/jobs/new')} style={{ marginTop: 18, padding: '11px 20px', borderRadius: 10, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Create your first job</button>
        </div>
      ) : (
        <>
          {/* Row 1 — Today's actions + Pipeline health */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={card}>
              <div style={label}>Today&apos;s actions</div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Action n={h?.todaysActions.awaitingReview} text="candidates awaiting review" onClick={go('/hire/candidates')} />
                <Action n={h?.todaysActions.interviewsToSchedule} text="interviews to schedule" onClick={go('/hire/candidates')} />
                <Action n={h?.todaysActions.jobsNeedAttention} text="jobs need attention" onClick={go('/hire/jobs')} />
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={label}>Pipeline health</div>
                <button onClick={go('/hire/analytics')} style={linkBtn}>Analytics →</button>
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(h?.funnel ?? []).every((f) => f.count === 0) ? (
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>No candidates in the pipeline yet.</div>
                ) : (h?.funnel ?? []).map((f, i) => {
                  const max = Math.max(...(h?.funnel ?? []).map((x) => x.count), 1)
                  return (
                    <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: '#64748B', width: 72 }}>{f.name}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 5, background: '#F1F5F9', overflow: 'hidden' }}><div style={{ width: `${(f.count / max) * 100}%`, height: '100%', background: funnelColor(i) }} /></div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#334155', width: 26, textAlign: 'right' }}>{f.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Talent pool growth */}
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div style={label}>🌱 Talent pool</div>
              <button onClick={go('/hire/talent-pool')} style={linkBtn}>View pool →</button>
            </div>
            {!pool ? <Skeleton /> : (
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{pool.total}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>total candidates</div>
                </div>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#6D28D9', lineHeight: 1 }}>+{pool.addedThisMonth}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    added this month
                    {pool.addedPrevMonth > 0 && (
                      <span style={{ color: pool.addedThisMonth >= pool.addedPrevMonth ? '#059669' : '#D97706', fontWeight: 700 }}>
                        {' '}{pool.addedThisMonth >= pool.addedPrevMonth ? '▲' : '▼'} {Math.round(((pool.addedThisMonth - pool.addedPrevMonth) / pool.addedPrevMonth) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 11.5, color: '#94A3B8', marginBottom: 6 }}>By source</div>
                  {pool.bySource.length === 0 ? <div style={{ fontSize: 13, color: '#94A3B8' }}>No candidates yet.</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {pool.bySource.slice(0, 5).map((s, i) => {
                        const max = Math.max(...pool.bySource.map((x) => x.count), 1)
                        return (
                          <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#64748B', width: 78, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.source}</span>
                            <div style={{ flex: 1, height: 7, borderRadius: 5, background: '#F1F5F9', overflow: 'hidden' }}><div style={{ width: `${(s.count / max) * 100}%`, height: '100%', background: funnelColor(i) }} /></div>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', width: 26, textAlign: 'right' }}>{s.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Top AI matches */}
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div style={label}>✨ Top AI-matched candidates <span style={{ color: '#94A3B8', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>· this week</span></div>
              {(h?.topMatches.length ?? 0) > 0 && <button onClick={go('/hire/candidates')} style={linkBtn}>View all →</button>}
            </div>
            {!h ? <Skeleton /> : h.topMatches.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94A3B8' }}>No AI matches yet — open a job and run <strong>Find matches</strong> on its Top Matches tab.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {h.topMatches.map((m) => (
                  <div key={m.candidateId + m.jobId} onClick={go(`/hire/jobs/${m.jobId}`)} className="lv-hover"
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', border: '1px solid #F1F5F9', borderRadius: 12, cursor: 'pointer' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 800, color: mColor(m.verdict), width: 30 }}>{m.score}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.candidateName}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {m.jobTitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row 3 — Velocity + Recent activity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
            <div style={card}>
              <div style={label}>Hiring velocity</div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Stat value={h?.velocity.avgTimeToShortlist != null ? `${h.velocity.avgTimeToShortlist}d` : '—'} text="Avg time-to-shortlist" />
                <Stat value={h ? String(h.velocity.candidatesThisWeek) : '—'} text="Candidates added this week" onClick={go('/hire/candidates')} />
                <Stat value={h ? String(h.velocity.interviewsRun) : '—'} text="Interviews run this week" onClick={go('/hire/interviews')} />
              </div>
            </div>

            <div style={card}>
              <div style={label}>Recent activity</div>
              <div style={{ marginTop: 14 }}>
                {!h ? <Skeleton /> : h.recent.length === 0 ? <div style={{ fontSize: 13, color: '#94A3B8' }}>No activity yet.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {h.recent.slice(0, 7).map((r) => (
                      <div key={r.id} style={{ fontSize: 13, color: '#475569', display: 'flex', gap: 8 }}>
                        <span style={{ color: '#CBD5E1' }}>•</span>
                        <span style={{ flex: 1 }}>{r.text}</span>
                        <span style={{ color: '#94A3B8', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`.lv-hover { transition: box-shadow .15s, border-color .15s, transform .15s; } .lv-hover:hover { border-color: #DDD6FE; box-shadow: 0 4px 14px rgba(109,40,217,0.1); transform: translateY(-1px); }`}</style>
    </div>
  )
}

function Action({ n, text, onClick }: { n?: number; text: string; onClick: () => void }) {
  const has = (n ?? 0) > 0
  return (
    <button onClick={onClick} disabled={!has} style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '7px 0', background: 'none', border: 'none', textAlign: 'left', cursor: has ? 'pointer' : 'default', width: '100%' }}>
      <span style={{ fontSize: 20, fontWeight: 800, color: has ? '#6D28D9' : '#CBD5E1', width: 30 }}>{n ?? '—'}</span>
      <span style={{ fontSize: 13.5, color: has ? '#334155' : '#94A3B8' }}>{text}</span>
      {has && <span style={{ marginLeft: 'auto', color: '#C4B5FD' }}>›</span>}
    </button>
  )
}

function Stat({ value, text, onClick }: { value: string; text: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'baseline', gap: 10, cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', minWidth: 52 }}>{value}</span>
      <span style={{ fontSize: 13, color: '#64748B' }}>{text}</span>
    </div>
  )
}

const linkBtn: React.CSSProperties = { marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer' }
function Skeleton() {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 14, borderRadius: 6, background: '#F1F5F9', width: `${80 - i * 12}%` }} />)}</div>
}
