'use client'
import { useEffect, useState, useCallback } from 'react'
import { Leaderboard } from '@/components/hire/leaderboard'
import { VIZ, CountUp, Delta, GrowBar } from '@/components/hire/viz'
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface Analytics {
  summary: { totalCandidates: number; activeJobs: number; avgAiScore: number | null; avgInterviewScore: number | null; hires: number; avgTimeToHireDays: number | null; openPipelineValue: number; wonValue: number }
  funnel: { name: string; count: number; conversionFromPrev: number | null }[]
  sources: { source: string; total: number; avgScore: number | null; advanceRate: number }[]
  timeInStage: { stage: string; avgDays: number }[]
  scoreDistribution: { range: string; count: number }[]
  recruiterActivity: { userId: string; name: string; stageMoves: number; notes: number; interviews: number; total: number }[]
  trend: { week: string; count: number }[]
  dealMetrics: { openValue: number; openCount: number; wonValue: number; wonCount: number; winRate: number }
  teamSize: number
  deltas: { totalCandidates: number | null; avgAiScore: { cur: number | null; prev: number | null }; hires: number | null }
  dropOff: { totalRejected: number; rejectionRate: number; stages: { stage: string; count: number; pctOfRejections: number; topReason: string | null; topReasonCount: number; reasons: { reason: string; count: number }[] }[] }
  predictions: { baselineDays: number; jobs: { id: string; title: string; daysOpen: number; candidates: number; risk: 'on_track' | 'at_risk' | 'stalled'; estDaysToFill: number | null }[] }
}
interface Job { id: string; title: string }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const RISK = { stalled: { c: VIZ.bad, bg: VIZ.badSoft, label: 'Stalled' }, at_risk: { c: VIZ.warn, bg: VIZ.warnSoft, label: 'At risk' }, on_track: { c: VIZ.good, bg: 'rgba(5,150,105,0.10)', label: 'On track' } }
const RANGES = [['30d', 30], ['90d', 90], ['365d', 365]] as const

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [view, setView] = useState<'overview' | 'leaderboard'>('overview')
  const [days, setDays] = useState(90)
  const [jobId, setJobId] = useState('')
  // Single status machine — avoids flip/flicker between multiple booleans.
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errMsg, setErrMsg] = useState('')
  // The window used for the LAST successful load (drives the CSV filename).
  // NOTE: we must NOT compute from/to during render — Date.now() changes every
  // render, which would give `load` a new identity each render and re-fire the
  // effect forever (the flicker loop). We compute them inside load() instead.
  const [range, setRange] = useState(() => {
    const to = new Date().toISOString()
    const from = new Date(Date.now() - 90 * 86400000).toISOString()
    return { from, to }
  })

  // Stable deps: only `days` and `jobId`. No render-derived timestamps here.
  const load = useCallback(() => {
    setStatus('loading')
    const to = new Date().toISOString()
    const from = new Date(Date.now() - days * 86400000).toISOString()
    setRange({ from, to })
    const qs = new URLSearchParams({ from, to, ...(jobId ? { jobId } : {}) })
    console.log('[hire/analytics] fetching', qs.toString())
    fetch(`/api/hire/analytics?${qs}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text().catch(() => '')}`.trim())
        return r.json()
      })
      .then((d) => {
        console.log('[hire/analytics] loaded', d?.summary)
        setData(d)
        setStatus('ready')
      })
      .catch((e) => {
        console.error('[hire/analytics] load failed:', e)
        setErrMsg(String(e?.message ?? e))
        setStatus('error')
      })
  }, [days, jobId])
  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/hire/jobs').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setJobs(d)).catch((e) => console.error('[hire/analytics] jobs load failed:', e)) }, [])

  const from = range.from
  const to = range.to

  function exportCsv() {
    if (!data) return
    const lines: string[] = []
    lines.push('Summary')
    lines.push(`Total Candidates,${data.summary.totalCandidates}`)
    lines.push(`Active Jobs,${data.summary.activeJobs}`)
    lines.push(`Avg AI Score,${data.summary.avgAiScore ?? 'n/a'}`)
    lines.push(`Avg Interview Score,${data.summary.avgInterviewScore ?? 'n/a'}`)
    lines.push(`Hires,${data.summary.hires}`)
    lines.push(`Avg Time-to-Hire (days),${data.summary.avgTimeToHireDays ?? 'n/a'}`)
    lines.push(`Open Pipeline,${data.summary.openPipelineValue}`)
    lines.push(`Won Value,${data.summary.wonValue}`)
    lines.push('', 'Funnel,Count,Conversion %')
    data.funnel.forEach((f) => lines.push(`${f.name},${f.count},${f.conversionFromPrev ?? ''}`))
    lines.push('', 'Source,Candidates,Avg AI Score,Advance Rate %')
    data.sources.forEach((s) => lines.push(`${s.source},${s.total},${s.avgScore ?? ''},${s.advanceRate}`))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `levl1-hire-analytics-${from.slice(0, 10)}-${to.slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sel: React.CSSProperties = { padding: '8px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Analytics</h1>
        {view === 'overview' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 8, padding: 3 }}>
              {RANGES.map(([label, d]) => <button key={label} onClick={() => setDays(d)} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6, border: 'none', background: days === d ? '#fff' : 'transparent', color: days === d ? '#6D28D9' : '#64748B', cursor: 'pointer', boxShadow: days === d ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{label}</button>)}
            </div>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={sel}><option value="">All jobs</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
            <button onClick={exportCsv} disabled={!data} style={{ ...sel, fontWeight: 600, color: '#6D28D9', cursor: 'pointer' }}>Export CSV</button>
          </div>
        )}
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 20 }}>
        {(['overview', 'leaderboard'] as const).map((t) => (
          <button key={t} onClick={() => setView(t)} style={{ padding: '9px 14px', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (view === t ? '#6D28D9' : 'transparent'), color: view === t ? '#6D28D9' : '#64748B', cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {view === 'leaderboard' && <Leaderboard />}

      {/* Show the spinner only on the FIRST load (no data yet). On refetch we
          keep the existing content visible so the page never flickers. */}
      {view === 'overview' && status === 'loading' && !data && <div style={{ color: '#475569' }}>Loading…</div>}

      {view === 'overview' && status === 'error' && (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#B91C1C' }}>Couldn&apos;t load analytics</div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{errMsg || 'Something went wrong.'}</div>
          <button onClick={load} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#6D28D9', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {view === 'overview' && status !== 'error' && data && data.summary.totalCandidates === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>Not enough data yet</div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Add candidates and run interviews to see analytics here.</div>
        </div>
      )}

      {view === 'overview' && status !== 'error' && data && data.summary.totalCandidates > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Headline metrics — numbers only mean something with comparison. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <TrendKpi label="Candidates added" value={data.summary.totalCandidates} deltaPct={data.deltas.totalCandidates} />
            <TrendKpi label="Avg AI score" value={data.summary.avgAiScore ?? '—'} cur={data.deltas.avgAiScore.cur} prev={data.deltas.avgAiScore.prev} />
            <TrendKpi label="Hires" value={data.summary.hires} deltaPct={data.deltas.hires} />
            <TrendKpi label="Avg time-to-hire" value={data.summary.avgTimeToHireDays != null ? `${data.summary.avgTimeToHireDays}d` : '—'} betterWhenLower />
          </div>

          {/* Q: Where do candidates drop off — and why? */}
          <div style={card}>
            <Q>Where do candidates drop off — and why?</Q>
            {data.funnel.every((f) => f.count === 0) ? <Empty /> : (() => {
              const max = Math.max(...data.funnel.map((x) => x.count), 1)
              const dropByStage = new Map(data.dropOff.stages.map((s) => [s.stage, s]))
              return data.funnel.map((f, i) => {
                const d = dropByStage.get(f.name)
                return (
                  <div key={f.name} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, color: VIZ.ink }}>{f.name}</span>
                      <span style={{ color: VIZ.slate }}><strong>{f.count}</strong>{f.conversionFromPrev != null ? <span style={{ color: VIZ.faint }}> · {f.conversionFromPrev}% from previous stage</span> : ''}</span>
                    </div>
                    <GrowBar pct={(f.count / max) * 100} color={VIZ.primary} delay={i * 70} height={12} />
                    {d && d.topReason && (
                      <div style={{ fontSize: 12, color: VIZ.warn, marginTop: 5 }}>↳ {d.count} rejected here — top reason: <strong>{d.topReason}</strong> ({d.topReasonCount})</div>
                    )}
                  </div>
                )
              })
            })()}
            <div style={{ fontSize: 12, color: VIZ.faint, marginTop: 8, borderTop: `1px solid ${VIZ.track}`, paddingTop: 10 }}>
              Overall rejection rate: <strong style={{ color: VIZ.slate }}>{data.dropOff.rejectionRate}%</strong> · {data.dropOff.totalRejected} rejected this period
            </div>
          </div>

          {/* Q: Which roles are at risk of stalling? (predictive) */}
          <div style={card}>
            <Q>Which roles are at risk of stalling?</Q>
            <div style={{ fontSize: 12, color: VIZ.faint, marginTop: -8, marginBottom: 12 }}>Estimated from current velocity · baseline time-to-fill ≈ {data.predictions.baselineDays}d</div>
            {data.predictions.jobs.length === 0 ? <Empty msg="No active roles." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.predictions.jobs.slice(0, 6).map((j) => {
                  const r = RISK[j.risk]
                  return (
                    <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${VIZ.track}`, borderRadius: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: r.c, background: r.bg, borderRadius: 100, padding: '3px 10px', whiteSpace: 'nowrap' }}>{r.label}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: VIZ.ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</span>
                      <span style={{ fontSize: 12, color: VIZ.faint, whiteSpace: 'nowrap' }}>{j.candidates} cand · open {j.daysOpen}d</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: VIZ.slate, whiteSpace: 'nowrap' }}>{j.estDaysToFill != null ? `~${j.estDaysToFill}d to fill` : 'no pipeline'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Q: Which sources produce candidates that advance? */}
          <div style={card}>
            <Q>Which sources produce candidates that advance?</Q>
            <div style={{ fontSize: 12, color: VIZ.faint, marginTop: -8, marginBottom: 12 }}>Sorted by advance rate (quality), not raw volume.</div>
            {data.sources.length === 0 ? <Empty /> : (() => {
              const sorted = [...data.sources].sort((a, b) => b.advanceRate - a.advanceRate)
              const best = sorted[0]?.advanceRate ?? 0
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sorted.map((s, i) => (
                    <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 110, fontSize: 13, fontWeight: 600, color: VIZ.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.source}</span>
                      <div style={{ flex: 1 }}><GrowBar pct={s.advanceRate} color={i === 0 && best > 0 ? VIZ.good : VIZ.primary} delay={i * 60} /></div>
                      <span style={{ width: 150, textAlign: 'right', fontSize: 12.5, color: VIZ.slate }}><strong>{s.advanceRate}%</strong> advance · {s.total} cand{s.avgScore != null ? ` · ${s.avgScore} avg` : ''}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Q: Are we screening for quality? + Q: Where does the pipeline slow down? */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="ana-row">
            <div style={card}>
              <Q>Are we screening for quality?</Q>
              <div style={{ fontSize: 12, color: VIZ.faint, marginTop: -8, marginBottom: 8 }}>AI score distribution of candidates.</div>
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.scoreDistribution} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: VIZ.slate }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: VIZ.faint }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: VIZ.track }} contentStyle={{ borderRadius: 8, border: `1px solid ${VIZ.line}`, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]} animationDuration={700}>
                      {data.scoreDistribution.map((s, i) => <Cell key={i} fill={s.range === '80-100' ? VIZ.good : s.range === 'Unscored' ? '#CBD5E1' : VIZ.primary} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={card}>
              <Q>Where does the pipeline slow down?</Q>
              <div style={{ fontSize: 12, color: VIZ.faint, marginTop: -8, marginBottom: 8 }}>Avg days candidates wait in each stage.</div>
              {data.timeInStage.length === 0 ? <Empty msg="No stage movement yet" /> : data.timeInStage.map((t, i) => {
                const max = Math.max(...data.timeInStage.map((x) => x.avgDays), 1)
                const slow = t.avgDays > 7
                return (
                  <div key={t.stage} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span style={{ color: VIZ.ink }}>{t.stage}</span><span style={{ color: slow ? VIZ.warn : VIZ.faint, fontWeight: slow ? 700 : 400 }}>{t.avgDays}d{slow ? ' ⚠' : ''}</span></div>
                    <GrowBar pct={(t.avgDays / max) * 100} color={slow ? VIZ.warn : VIZ.primary} delay={i * 60} height={10} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Q: Who's moving the pipeline? + Q: Where is revenue? */}
          <div style={{ display: 'grid', gridTemplateColumns: data.teamSize > 1 ? '1fr 1fr' : '1fr', gap: 16 }} className="ana-row">
            {data.teamSize > 1 && (
              <div style={card}>
                <Q>Who&apos;s moving the pipeline?</Q>
                {data.recruiterActivity.length === 0 ? <Empty /> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ color: VIZ.slate, fontSize: 11, textTransform: 'uppercase' }}>{['Recruiter', 'Moves', 'Interviews', 'Notes'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}</tr></thead>
                    <tbody>{data.recruiterActivity.map((r) => <tr key={r.userId} style={{ borderTop: `1px solid ${VIZ.track}` }}><td style={{ padding: '8px', fontWeight: 600 }}>{r.name}</td><td style={{ padding: '8px' }}>{r.stageMoves}</td><td style={{ padding: '8px' }}>{r.interviews}</td><td style={{ padding: '8px' }}>{r.notes}</td></tr>)}</tbody>
                  </table>
                )}
              </div>
            )}
            <div style={card}>
              <Q>Where is revenue concentrated?</Q>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <Stat label="Open pipeline" value={inr(data.dealMetrics.openValue)} sub={`${data.dealMetrics.openCount} deals`} />
                <Stat label="Won (this period)" value={inr(data.dealMetrics.wonValue)} sub={`${data.dealMetrics.wonCount} deals`} color={VIZ.good} />
                <Stat label="Win rate" value={`${data.dealMetrics.winRate}%`} />
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@media (max-width:760px){ .ana-row{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  )
}

// Question-as-title for each analytics section.
function Q({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 15, fontWeight: 800, color: VIZ.ink, marginBottom: 14, letterSpacing: '-0.01em' }}>{children}</div> }
function Empty({ msg = 'Not enough data yet' }: { msg?: string }) { return <div style={{ fontSize: 13, color: VIZ.faint, padding: '12px 0' }}>{msg}</div> }
function Stat({ label, value, sub, color = VIZ.ink }: { label: string; value: string; sub?: string; color?: string }) {
  return <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 13, color: VIZ.slate, width: 120 }}>{label}</span><span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>{sub && <span style={{ fontSize: 12, color: VIZ.slate }}>{sub}</span>}</div>
}

// KPI with a count-up value and a period-over-period delta.
function TrendKpi({ label, value, deltaPct, cur, prev, betterWhenLower }: { label: string; value: number | string; deltaPct?: number | null; cur?: number | null; prev?: number | null; betterWhenLower?: boolean }) {
  const numeric = typeof value === 'number'
  return (
    <div style={card}>
      <div style={{ fontSize: 11.5, color: VIZ.slate, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: VIZ.ink, marginTop: 4 }}>{numeric ? <CountUp value={value as number} /> : value}</div>
      <div style={{ marginTop: 4 }}>
        {cur != null || prev != null
          ? <Delta cur={cur ?? null} prev={prev ?? null} betterWhenLower={betterWhenLower} suffix="" />
          : deltaPct == null ? <span style={{ fontSize: 12, color: VIZ.faint }}>—</span>
            : (() => { const up = deltaPct > 0; const good = betterWhenLower ? !up : up; return <span style={{ fontSize: 12, fontWeight: 700, color: deltaPct === 0 ? VIZ.faint : good ? VIZ.good : VIZ.bad }}>{deltaPct === 0 ? '→ no change' : `${up ? '▲' : '▼'} ${Math.abs(deltaPct)}% vs last`}</span> })()}
      </div>
    </div>
  )
}
