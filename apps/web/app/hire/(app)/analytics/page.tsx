'use client'
import { useEffect, useState, useCallback } from 'react'

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
}
interface Job { id: string; title: string }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const RANGES = [['30d', 30], ['90d', 90], ['365d', 365]] as const

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Analytics</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 8, padding: 3 }}>
            {RANGES.map(([label, d]) => <button key={label} onClick={() => setDays(d)} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6, border: 'none', background: days === d ? '#fff' : 'transparent', color: days === d ? '#4F46E5' : '#64748B', cursor: 'pointer', boxShadow: days === d ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{label}</button>)}
          </div>
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={sel}><option value="">All jobs</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
          <button onClick={exportCsv} disabled={!data} style={{ ...sel, fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>Export CSV</button>
        </div>
      </div>

      {/* Show the spinner only on the FIRST load (no data yet). On refetch we
          keep the existing content visible so the page never flickers. */}
      {status === 'loading' && !data && <div style={{ color: '#94A3B8' }}>Loading…</div>}

      {status === 'error' && (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#B91C1C' }}>Couldn&apos;t load analytics</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>{errMsg || 'Something went wrong.'}</div>
          <button onClick={load} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {status !== 'error' && data && data.summary.totalCandidates === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>Not enough data yet</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Add candidates and run interviews to see analytics here.</div>
        </div>
      )}

      {status !== 'error' && data && data.summary.totalCandidates > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Row 1 — KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
            <Kpi label="Total Candidates" value={data.summary.totalCandidates} />
            <Kpi label="Active Jobs" value={data.summary.activeJobs} />
            <Kpi label="Avg AI Score" value={data.summary.avgAiScore ?? '—'} />
            <Kpi label="Avg Interview Score" value={data.summary.avgInterviewScore ?? '—'} />
            <Kpi label="Hires" value={data.summary.hires} />
            <Kpi label="Avg Time-to-Hire" value={data.summary.avgTimeToHireDays != null ? `${data.summary.avgTimeToHireDays}d` : '—'} />
          </div>

          {/* Row 2 — funnel + score dist */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }} className="ana-row">
            <div style={card}>
              <H>Pipeline funnel</H>
              {data.funnel.every((f) => f.count === 0) ? <Empty /> : data.funnel.map((f, i) => {
                const max = Math.max(...data.funnel.map((x) => x.count), 1)
                return (
                  <div key={f.name} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{f.name}</span>
                      <span style={{ color: '#64748B' }}>{f.count}{f.conversionFromPrev != null ? ` · ${f.conversionFromPrev}%` : ''}</span>
                    </div>
                    <div style={{ height: 12, borderRadius: 6, background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ width: `${(f.count / max) * 100}%`, height: '100%', background: `hsl(${250 - i * 24} 80% 60%)` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={card}>
              <H>AI score distribution</H>
              <BarChart items={data.scoreDistribution.map((s) => ({ label: s.range, value: s.count }))} color="#7C3AED" />
            </div>
          </div>

          {/* Row 3 — sources */}
          <div style={card}>
            <H>Source effectiveness</H>
            {data.sources.length === 0 ? <Empty /> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>{['Source', 'Candidates', 'Avg AI Score', 'Advance Rate'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {(() => { const best = Math.max(...data.sources.map((s) => s.advanceRate)); return data.sources.map((s) => (
                    <tr key={s.source} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{s.source}</td>
                      <td style={{ padding: '8px' }}>{s.total}</td>
                      <td style={{ padding: '8px' }}>{s.avgScore ?? '—'}</td>
                      <td style={{ padding: '8px' }}>{s.advanceRate}%{s.advanceRate === best && best > 0 ? <span style={{ color: '#059669', fontSize: 11, marginLeft: 6 }}>← best quality</span> : ''}</td>
                    </tr>
                  )) })()}
                </tbody>
              </table>
            )}
          </div>

          {/* Row 4 — time in stage + trend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="ana-row">
            <div style={card}>
              <H>Avg time in stage</H>
              {data.timeInStage.length === 0 ? <Empty msg="No stage movement yet" /> : data.timeInStage.map((t) => {
                const max = Math.max(...data.timeInStage.map((x) => x.avgDays), 1)
                const slow = t.avgDays > 7
                return (
                  <div key={t.stage} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span style={{ color: '#334155' }}>{t.stage}</span><span style={{ color: slow ? '#D97706' : '#64748B', fontWeight: slow ? 700 : 400 }}>{t.avgDays}d{slow ? ' ⚠' : ''}</span></div>
                    <div style={{ height: 10, borderRadius: 5, background: '#F1F5F9', overflow: 'hidden' }}><div style={{ width: `${(t.avgDays / max) * 100}%`, height: '100%', background: slow ? '#F59E0B' : '#4F46E5' }} /></div>
                  </div>
                )
              })}
            </div>
            <div style={card}>
              <H>Candidates added / week</H>
              {data.trend.length === 0 ? <Empty /> : <BarChart items={data.trend.map((t) => ({ label: t.week.split('-')[1], value: t.count }))} color="#4F46E5" />}
            </div>
          </div>

          {/* Row 5 — recruiters + CRM */}
          <div style={{ display: 'grid', gridTemplateColumns: data.teamSize > 1 ? '1fr 1fr' : '1fr', gap: 16 }} className="ana-row">
            {data.teamSize > 1 && (
              <div style={card}>
                <H>Recruiter productivity</H>
                {data.recruiterActivity.length === 0 ? <Empty /> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>{['Recruiter', 'Moves', 'Interviews', 'Notes'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}</tr></thead>
                    <tbody>{data.recruiterActivity.map((r) => <tr key={r.userId} style={{ borderTop: '1px solid #F1F5F9' }}><td style={{ padding: '8px', fontWeight: 600 }}>{r.name}</td><td style={{ padding: '8px' }}>{r.stageMoves}</td><td style={{ padding: '8px' }}>{r.interviews}</td><td style={{ padding: '8px' }}>{r.notes}</td></tr>)}</tbody>
                  </table>
                )}
              </div>
            )}
            <div style={card}>
              <H>CRM & revenue</H>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Stat label="Open pipeline" value={inr(data.dealMetrics.openValue)} sub={`${data.dealMetrics.openCount} deals`} />
                <Stat label="Won (this period)" value={inr(data.dealMetrics.wonValue)} sub={`${data.dealMetrics.wonCount} deals`} color="#10B981" />
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

function Kpi({ label, value }: { label: string; value: number | string }) {
  return <div style={card}><div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div><div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{value}</div></div>
}
function H({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 14 }}>{children}</div> }
function Empty({ msg = 'Not enough data yet' }: { msg?: string }) { return <div style={{ fontSize: 13, color: '#CBD5E1', padding: '12px 0' }}>{msg}</div> }
function Stat({ label, value, sub, color = '#0F172A' }: { label: string; value: string; sub?: string; color?: string }) {
  return <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 13, color: '#64748B', width: 120 }}>{label}</span><span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>{sub && <span style={{ fontSize: 12, color: '#94A3B8' }}>{sub}</span>}</div>
}
function BarChart({ items, color }: { items: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
      {items.map((it) => (
        <div key={it.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 11, color: '#64748B' }}>{it.value}</div>
          <div style={{ width: '100%', height: `${(it.value / max) * 90}px`, minHeight: 2, background: color, borderRadius: '4px 4px 0 0' }} />
          <div style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{it.label}</div>
        </div>
      ))}
    </div>
  )
}
