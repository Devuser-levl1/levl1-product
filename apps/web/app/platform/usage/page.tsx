'use client'
import { useEffect, useMemo, useState } from 'react'
import { VIZ, CountUp, Sparkline, GrowBar } from '@/components/hire/viz'

interface Row {
  id: string; name: string; type: string; plan: string; status: string
  users: number; logins7d: number; jobs: number; activeJobs: number
  candidates: number; candidates30d: number; interviews: number
  deals: number; pipelineValue: number; events8w: number; spark: number[]
  lastActiveAt: string | null; createdAt: string
}
interface Usage {
  totals: { tenants: number; activeTenants: number; newTenantsThisMonth: number; paying: number; onTrial: number; users: number; candidates: number; interviews: number; candidates30d: number }
  rows: Row[]
  platformSpark: number[]
  featureUsage: { feature: string; count: number }[]
}

type SortKey = 'name' | 'status' | 'users' | 'candidates' | 'candidates30d' | 'interviews' | 'events8w' | 'lastActiveAt' | 'createdAt'
const card: React.CSSProperties = { background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 16, padding: 20 }
const FEATURE_LABEL: Record<string, string> = { stage_change: 'Stage moves', note: 'Notes', interview_scheduled: 'Interviews scheduled', ai_scored: 'AI scoring', reject: 'Rejections', delete: 'Deletions', candidate_create: 'Candidates added', job_create: 'Jobs created', job_update: 'Job edits', rubric_change: 'Rubric edits', deal_create: 'Deals created', deal_update: 'Deal edits', deal_delete: 'Deals deleted', team_member_invite: 'Team invites', stage_move: 'Stage moves' }
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'
const ago = (iso: string | null) => { if (!iso) return 'never'; const d = Math.floor((Date.now() - +new Date(iso)) / 86400000); return d <= 0 ? 'today' : d === 1 ? '1d ago' : `${d}d ago` }

export default function UsageLedgerPage() {
  const [data, setData] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('lastActiveAt')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => { fetch('/api/platform/usage').then((r) => (r.ok ? r.json() : null)).then((d) => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }, [])

  const view = useMemo(() => {
    if (!data) return []
    const term = q.trim().toLowerCase()
    const out = data.rows.filter((r) => !term || r.name.toLowerCase().includes(term) || r.plan.toLowerCase().includes(term) || r.type.toLowerCase().includes(term))
    const cmp = (a: Row, b: Row) => {
      let av: string | number = '', bv: string | number = ''
      if (sort === 'name' || sort === 'status') { av = (a[sort] || '').toLowerCase(); bv = (b[sort] || '').toLowerCase() }
      else if (sort === 'lastActiveAt' || sort === 'createdAt') { av = a[sort] ? +new Date(a[sort] as string) : 0; bv = b[sort] ? +new Date(b[sort] as string) : 0 }
      else { av = a[sort] as number; bv = b[sort] as number }
      return av < bv ? (dir === 'asc' ? -1 : 1) : av > bv ? (dir === 'asc' ? 1 : -1) : 0
    }
    return [...out].sort(cmp)
  }, [data, q, sort, dir])

  const toggle = (k: SortKey) => { if (sort === k) setDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSort(k); setDir(k === 'name' ? 'asc' : 'desc') } }
  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th onClick={() => toggle(k)} style={{ padding: '10px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: VIZ.slate, cursor: 'pointer', textAlign: right ? 'right' : 'left', whiteSpace: 'nowrap', userSelect: 'none' }}>{children}{sort === k ? <span style={{ color: VIZ.primary }}>{dir === 'asc' ? ' ↑' : ' ↓'}</span> : null}</th>
  )

  return (
    <div style={{ maxWidth: 1240 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: VIZ.ink, margin: '0 0 4px' }}>Usage Ledger</h1>
      <div style={{ fontSize: 14, color: VIZ.slate, marginBottom: 20 }}>How every client uses Levl1 — activity, volumes and patterns across all tenants.</div>

      {loading ? <div style={{ color: VIZ.slate }}>Loading…</div> : !data ? <div style={{ color: VIZ.bad }}>Couldn’t load usage.</div> : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
            <Kpi label="Total clients" value={data.totals.tenants} />
            <Kpi label="Active (30d)" value={data.totals.activeTenants} accent={VIZ.good} />
            <Kpi label="Paying" value={data.totals.paying} />
            <Kpi label="On trial" value={data.totals.onTrial} accent={VIZ.warn} />
            <Kpi label="New this month" value={data.totals.newTenantsThisMonth} accent={VIZ.primary} />
            <Kpi label="Candidates (30d)" value={data.totals.candidates30d} />
          </div>

          {/* Platform activity + feature usage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }} className="pf-row">
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 800, color: VIZ.ink, marginBottom: 4 }}>Platform activity</div>
              <div style={{ fontSize: 12, color: VIZ.faint, marginBottom: 12 }}>Events across all clients, last 8 weeks.</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
                {data.platformSpark.map((v, i) => { const mx = Math.max(...data.platformSpark, 1); return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, color: VIZ.faint }}>{v}</div>
                    <div style={{ width: '100%', height: `${(v / mx) * 64}px`, minHeight: 2, background: i === data.platformSpark.length - 1 ? VIZ.primary : '#C4B5FD', borderRadius: '4px 4px 0 0', transition: 'height .7s cubic-bezier(.22,1,.36,1)' }} />
                    <div style={{ fontSize: 9, color: VIZ.faint }}>{i === 7 ? 'now' : `-${7 - i}w`}</div>
                  </div>
                ) })}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 800, color: VIZ.ink, marginBottom: 4 }}>What clients actually do</div>
              <div style={{ fontSize: 12, color: VIZ.faint, marginBottom: 12 }}>Feature usage, last 8 weeks.</div>
              {data.featureUsage.length === 0 ? <div style={{ fontSize: 13, color: VIZ.faint }}>No activity yet.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {data.featureUsage.slice(0, 7).map((f, i) => { const mx = Math.max(...data.featureUsage.map((x) => x.count), 1); return (
                    <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 130, fontSize: 12, color: VIZ.slate, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{FEATURE_LABEL[f.feature] ?? f.feature}</span>
                      <div style={{ flex: 1 }}><GrowBar pct={(f.count / mx) * 100} delay={i * 50} height={8} /></div>
                      <span style={{ width: 44, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#334155' }}>{f.count}</span>
                    </div>
                  ) })}
                </div>
              )}
            </div>
          </div>

          {/* Per-client table */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${VIZ.track}` }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: VIZ.ink }}>Clients</div>
              <span style={{ fontSize: 12, color: VIZ.faint }}>{view.length} of {data.rows.length}</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client…" style={{ marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: `1px solid ${VIZ.line}`, fontSize: 13, minWidth: 200 }} />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#F8FAFC' }}>
                  <Th k="name">Client</Th><Th k="status">Status</Th>
                  <Th k="users" right>Users</Th><Th k="candidates" right>Cands</Th><Th k="candidates30d" right>30d</Th>
                  <Th k="interviews" right>Interviews</Th><Th k="events8w" right>Activity 8w</Th>
                  <Th k="lastActiveAt">Last active</Th><Th k="createdAt">Joined</Th>
                </tr></thead>
                <tbody>
                  {view.map((r) => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${VIZ.track}` }}>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 700, color: VIZ.ink }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: VIZ.faint }}>{r.type} · {r.plan} · {r.activeJobs}/{r.jobs} jobs</div>
                      </td>
                      <td style={{ padding: '10px' }}><StatusPill status={r.status} /></td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{r.users}<span style={{ color: VIZ.faint, fontSize: 11 }}> · {r.logins7d}↻</span></td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{r.candidates}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: r.candidates30d > 0 ? VIZ.good : VIZ.faint }}>{r.candidates30d || '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{r.interviews || '—'}</td>
                      <td style={{ padding: '10px' }}><div style={{ display: 'flex', justifyContent: 'flex-end' }}><Sparkline data={r.spark} width={72} height={24} color={r.events8w > 0 ? VIZ.primary : '#CBD5E1'} /></div></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap', color: r.lastActiveAt && Date.now() - +new Date(r.lastActiveAt) < 7 * 86400000 ? VIZ.good : VIZ.slate }}>{ago(r.lastActiveAt)}</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap', color: VIZ.faint }}>{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                  {view.length === 0 && <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: VIZ.faint }}>No clients match.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <style>{`@media (max-width:820px){ .pf-row{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  )
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return <div style={card}><div style={{ fontSize: 11, color: VIZ.slate, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div><div style={{ fontSize: 26, fontWeight: 800, color: accent ?? VIZ.ink, marginTop: 4 }}><CountUp value={value} /></div></div>
}
function StatusPill({ status }: { status: string }) {
  const c = status === 'Paid' ? VIZ.good : status.startsWith('Trial') ? VIZ.primary : status === 'Past due' ? VIZ.warn : VIZ.bad
  const bg = status === 'Paid' ? 'rgba(5,150,105,0.10)' : status.startsWith('Trial') ? VIZ.primarySoft : status === 'Past due' ? VIZ.warnSoft : VIZ.badSoft
  return <span style={{ fontSize: 11, fontWeight: 700, color: c, background: bg, borderRadius: 100, padding: '2px 9px', whiteSpace: 'nowrap' }}>{status}</span>
}
