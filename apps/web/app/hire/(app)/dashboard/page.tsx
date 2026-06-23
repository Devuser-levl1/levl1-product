'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { VIZ, CountUp, Sparkline, Delta, GrowBar } from '@/components/hire/viz'

interface Insight { id: string; severity: 'bad' | 'warn' | 'good'; icon: string; title: string; body: string; actionLabel: string; href: string }
interface FunnelStage { name: string; count: number; avgDays: number | null; severity: 'ok' | 'warn' | 'bad'; conversionFromPrev: number | null }
interface VTrend { key: string; label: string; value: number | null; prev: number | null; unit: string; betterWhenLower: boolean; spark: number[] | null }
interface Home {
  isEmpty: boolean
  gettingStarted: { job: boolean; candidate: boolean; teammate: boolean }
  insights: Insight[]
  funnel: FunnelStage[]
  velocityTrends: VTrend[]
  topMatches: { candidateId: string; candidateName: string; candidateTitle: string | null; jobId: string; jobTitle: string; score: number; verdict: string; reason: string | null }[]
  recent: { id: string; text: string; at: string }[]
}

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 16, padding: 22 }
const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: VIZ.slate, textTransform: 'uppercase', letterSpacing: '0.06em' }
const linkBtn: React.CSSProperties = { marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: VIZ.primary, background: 'none', border: 'none', cursor: 'pointer' }
const mColor = (v: string) => (v === 'strong' ? VIZ.good : v === 'good' ? VIZ.primary : v === 'partial' ? VIZ.warn : VIZ.slate)
const sevColor = (s: string) => (s === 'bad' ? VIZ.bad : s === 'warn' ? VIZ.warn : s === 'good' ? VIZ.good : VIZ.primary)
const sevSoft = (s: string) => (s === 'bad' ? VIZ.badSoft : s === 'warn' ? VIZ.warnSoft : s === 'good' ? 'rgba(5,150,105,0.10)' : VIZ.primarySoft)

export default function HireDashboard() {
  const router = useRouter()
  const [h, setH] = useState<Home | null>(null)
  const [name, setName] = useState('')
  const [ask, setAsk] = useState('')
  const [pool, setPool] = useState<{ total: number; addedThisMonth: number; addedPrevMonth: number; bySource: { source: string; count: number }[] } | null>(null)

  useEffect(() => { fetch('/api/hire/dashboard/home').then((r) => (r.ok ? r.json() : null)).then(setH).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/hire/talent-pool/stats').then((r) => (r.ok ? r.json() : null)).then(setPool).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => setName(d?.user?.name?.split(' ')[0] ?? '')).catch(() => {}) }, [])

  const greeting = (() => { const hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening' })()
  const go = (href: string) => () => router.push(href)
  const sendAsk = (q: string) => { const query = q.trim(); if (!query) return; window.dispatchEvent(new CustomEvent('levl1:ask', { detail: { question: query } })); setAsk('') }

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: VIZ.ink, margin: '0 0 4px' }}>{greeting}{name ? `, ${name}` : ''}.</h1>
      <div style={{ fontSize: 15, color: VIZ.slate, marginBottom: 20 }}>Here&apos;s what needs you today.</div>

      {/* ── Ask Levl1 bar ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'linear-gradient(135deg, #faf5ff, #f5f3ff)', border: `1px solid ${VIZ.primarySoft}`, borderRadius: 14, padding: '10px 12px', marginBottom: 18 }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <input
          value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendAsk(ask) }}
          placeholder="Ask Levl1 — e.g. “top candidates this week”, “move 80+ scorers to Screening”"
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: VIZ.ink, outline: 'none' }}
        />
        <button onClick={() => sendAsk(ask)} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: VIZ.primary, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Ask</button>
      </div>

      {h?.isEmpty ? (
        <EmptyState gs={h.gettingStarted} go={go} />
      ) : (
        <>
          {/* ── Needs you today — AI insight/action cards ── */}
          {(h?.insights?.length ?? 0) > 0 && (
            <>
              <div style={{ ...label, marginBottom: 10 }}>Needs you today</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 22 }}>
                {h!.insights.map((ins) => (
                  <div key={ins.id} style={{ ...card, padding: 18, borderLeft: `3px solid ${sevColor(ins.severity)}`, display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeUp .4s ease both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: sevSoft(ins.severity), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{ins.icon}</span>
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: VIZ.ink }}>{ins.title}</span>
                    </div>
                    <div style={{ fontSize: 13, color: VIZ.slate, lineHeight: 1.5, flex: 1 }}>{ins.body}</div>
                    <button onClick={go(ins.href)} style={{ alignSelf: 'flex-start', marginTop: 2, padding: '7px 14px', borderRadius: 8, border: 'none', background: sevColor(ins.severity), color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>{ins.actionLabel} →</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Signature visual: pipeline flow with bottleneck highlight ── */}
          <div style={{ ...card, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
              <div style={label}>Pipeline flow</div>
              <span style={{ marginLeft: 10, fontSize: 12, color: VIZ.faint }}>amber/red = candidates waiting too long</span>
              <button onClick={go('/hire/pipeline')} style={linkBtn}>Open pipeline →</button>
            </div>
            <PipelineFlow funnel={h?.funnel ?? []} />
          </div>

          {/* ── Velocity strip — trends, not bare numbers ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 18 }}>
            {(h?.velocityTrends ?? []).map((m) => (
              <div key={m.key} style={card}>
                <div style={{ fontSize: 12.5, color: VIZ.slate, fontWeight: 600 }}>{m.label}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: VIZ.ink, lineHeight: 1 }}>
                    {m.value == null ? '—' : <CountUp value={m.value} decimals={m.unit === 'd' ? 1 : 0} />}<span style={{ fontSize: 13, fontWeight: 600, color: VIZ.faint }}>{m.unit}</span>
                  </div>
                  {m.spark && <Sparkline data={m.spark} color={VIZ.primary} />}
                </div>
                <div style={{ marginTop: 6 }}><Delta cur={m.value} prev={m.prev} betterWhenLower={m.betterWhenLower} /></div>
              </div>
            ))}
          </div>

          {/* ── Talent pool growth ── */}
          {pool && (
            <div style={{ ...card, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <div style={label}>🌱 Talent pool</div>
                <button onClick={go('/hire/talent-pool')} style={linkBtn}>View pool →</button>
              </div>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: VIZ.ink, lineHeight: 1 }}><CountUp value={pool.total} /></div>
                  <div style={{ fontSize: 12, color: VIZ.slate, marginTop: 4 }}>total candidates</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: VIZ.primary, lineHeight: 1 }}>+<CountUp value={pool.addedThisMonth} /></div>
                  <div style={{ fontSize: 12, color: VIZ.slate, marginTop: 4 }}>added this month <Delta cur={pool.addedThisMonth} prev={pool.addedPrevMonth} /></div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 11.5, color: VIZ.faint, marginBottom: 6 }}>By source</div>
                  {pool.bySource.length === 0 ? <div style={{ fontSize: 13, color: VIZ.faint }}>No candidates yet.</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {pool.bySource.slice(0, 5).map((s, i) => {
                        const mx = Math.max(...pool.bySource.map((x) => x.count), 1)
                        return (
                          <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: VIZ.slate, width: 78, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.source}</span>
                            <div style={{ flex: 1 }}><GrowBar pct={(s.count / mx) * 100} height={7} delay={i * 80} /></div>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', width: 26, textAlign: 'right' }}>{s.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Top AI matches ── */}
          <div style={{ ...card, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div style={label}>✨ Top AI-matched candidates <span style={{ color: VIZ.faint, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>· this week</span></div>
              {(h?.topMatches.length ?? 0) > 0 && <button onClick={go('/hire/candidates')} style={linkBtn}>View all →</button>}
            </div>
            {!h ? <Skeleton /> : h.topMatches.length === 0 ? (
              <div style={{ fontSize: 13, color: VIZ.faint }}>No AI matches yet — open a job and run <strong>Find matches</strong> on its Top Matches tab.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {h.topMatches.map((m) => (
                  <div key={m.candidateId + m.jobId} onClick={go(`/hire/jobs/${m.jobId}`)} className="lv-hover"
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', border: `1px solid ${VIZ.track}`, borderRadius: 12, cursor: 'pointer' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 800, color: mColor(m.verdict), width: 30 }}>{m.score}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: VIZ.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.candidateName}</div>
                      <div style={{ fontSize: 12, color: VIZ.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {m.jobTitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Recent activity (compact) ── */}
          <div style={card}>
            <div style={label}>Recent activity</div>
            <div style={{ marginTop: 12 }}>
              {!h ? <Skeleton /> : h.recent.length === 0 ? <div style={{ fontSize: 13, color: VIZ.faint }}>No activity yet.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {h.recent.slice(0, 7).map((r) => (
                    <div key={r.id} style={{ fontSize: 13, color: VIZ.slate, display: 'flex', gap: 8 }}>
                      <span style={{ color: '#CBD5E1' }}>•</span>
                      <span style={{ flex: 1 }}>{r.text}</span>
                      <span style={{ color: VIZ.faint, fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`.lv-hover { transition: box-shadow .15s, border-color .15s, transform .15s; } .lv-hover:hover { border-color: #DDD6FE; box-shadow: 0 4px 14px rgba(109,40,217,0.1); transform: translateY(-1px); }`}</style>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}

function PipelineFlow({ funnel }: { funnel: FunnelStage[] }) {
  if (funnel.every((f) => f.count === 0)) return <div style={{ fontSize: 13, color: VIZ.faint }}>No candidates in the pipeline yet.</div>
  const max = Math.max(...funnel.map((f) => f.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto' }}>
      {funnel.map((f, i) => {
        const accent = sevColor(f.severity)
        const isBottleneck = f.severity !== 'ok'
        return (
          <div key={f.name} style={{ display: 'flex', alignItems: 'stretch', flex: 1, minWidth: 150 }}>
            <div style={{ flex: 1, border: `1px solid ${isBottleneck ? accent : VIZ.line}`, background: isBottleneck ? sevSoft(f.severity) : '#fff', borderRadius: 12, padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: VIZ.slate, textTransform: 'uppercase', letterSpacing: 0.4 }}>{f.name}</span>
                {isBottleneck && <span title="Candidates wait too long here" style={{ fontSize: 10, fontWeight: 800, color: accent }}>🐢 {f.avgDays}d</span>}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: VIZ.ink, lineHeight: 1 }}><CountUp value={f.count} /></div>
              <GrowBar pct={(f.count / max) * 100} color={isBottleneck ? accent : VIZ.primary} delay={i * 90} />
              <div style={{ fontSize: 11, color: VIZ.faint }}>
                {f.avgDays != null ? `${f.avgDays}d avg in stage` : 'No timing data'}
                {f.conversionFromPrev != null && <span> · {f.conversionFromPrev}% from prev</span>}
              </div>
            </div>
            {i < funnel.length - 1 && <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: '#CBD5E1', fontSize: 18 }}>→</div>}
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ gs, go }: { gs: Home['gettingStarted']; go: (h: string) => () => void }) {
  const steps = [
    { done: gs.job, label: 'Create your first job', href: '/hire/jobs/new', desc: 'Post a role — AI writes the brief.' },
    { done: gs.candidate, label: 'Add candidates', href: '/hire/candidates', desc: 'Import résumés or source — AI scores them.' },
    { done: gs.teammate, label: 'Invite your team', href: '/hire/settings', desc: 'Bring recruiters into the workspace.' },
  ]
  return (
    <div style={{ ...card, padding: '32px 28px' }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>🚀</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: VIZ.ink }}>Let’s get your pipeline moving</div>
      <div style={{ fontSize: 14, color: VIZ.slate, marginTop: 6, marginBottom: 20 }}>Three quick steps to a working hiring workspace.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s, i) => (
          <div key={i} onClick={go(s.href)} className="lv-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${VIZ.line}`, borderRadius: 12, cursor: 'pointer' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? VIZ.good : VIZ.primarySoft, color: s.done ? '#fff' : VIZ.primary, fontWeight: 800, fontSize: 13 }}>{s.done ? '✓' : i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: VIZ.ink }}>{s.label}</div>
              <div style={{ fontSize: 12.5, color: VIZ.faint }}>{s.desc}</div>
            </div>
            <span style={{ color: VIZ.primary, fontWeight: 700, fontSize: 13 }}>→</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Skeleton() {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 14, borderRadius: 6, background: VIZ.track, width: `${90 - i * 15}%` }} />)}</div>
}
