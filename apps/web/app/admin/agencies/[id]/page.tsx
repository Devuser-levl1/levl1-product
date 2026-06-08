'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Shell, SectionTitle, Card, Table, Td, PlanBadge, StatusBadge, ago } from '../../ui'

interface Detail {
  id: string; name: string; email: string; website: string | null; plan: string
  gstNumber: string | null; legalName: string | null
  subscriptionStatus: string | null; currentPeriodEnd: string | null; trialExpiresAt: string | null
  interviewsUsed: number; interviewsLimit: number; createdAt: string
  users: { name: string; email: string; role: string; lastLoginAt: string | null }[]
  positions: { id: string; title: string; company: string; status: string; candidateCount: number; createdAt: string }[]
  interviews: { id: string; candidateName: string; position: string; score: number | null; status: string; at: string }[]
}

const PLAN_OPTIONS = ['trial', 'starter', 'professional', 'enterprise', 'expired']

export default function AgencyDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<Detail | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const d = await fetch(`/api/admin/agencies/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    if (d && !d.error) setData(d)
  }, [id])

  useEffect(() => { load() }, [load])

  async function extendTrial() {
    setBusy('trial'); setMsg('')
    const res = await fetch(`/api/admin/agencies/${id}/extend-trial`, { method: 'POST' })
    setBusy(null)
    setMsg(res.ok ? 'Trial extended 14 days, usage reset.' : 'Failed to extend trial.')
    if (res.ok) load()
  }

  async function changePlan(plan: string) {
    if (!plan || plan === data?.plan) return
    setBusy('plan'); setMsg('')
    const res = await fetch(`/api/admin/agencies/${id}/change-plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }),
    })
    setBusy(null)
    setMsg(res.ok ? `Plan changed to ${plan}.` : 'Failed to change plan.')
    if (res.ok) load()
  }

  if (!data) {
    return <Shell><div style={{ color: '#64748B' }}>Loading…</div></Shell>
  }

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>{data.name}</h1>
        <PlanBadge plan={data.plan} />
      </div>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
        {data.email || 'no email'} · {data.website || 'no website'} · joined {ago(data.createdAt)}
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
        <Info label="Usage" value={`${data.interviewsUsed} / ${data.interviewsLimit}`} />
        <Info label="Trial ends" value={data.trialExpiresAt ? new Date(data.trialExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
        <Info label="GST" value={data.gstNumber || '—'} />
        <Info label="Subscription" value={data.subscriptionStatus || '—'} />
      </div>

      {/* Actions */}
      <SectionTitle>Actions</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <button onClick={extendTrial} disabled={busy === 'trial'} style={btn('#F59E0B')}>
          {busy === 'trial' ? 'Extending…' : 'Extend Trial (+14d)'}
        </button>
        <select
          defaultValue=""
          onChange={(e) => changePlan(e.target.value)}
          disabled={busy === 'plan'}
          style={{ background: '#111827', color: '#E2E8F0', border: '1px solid #374151', borderRadius: 8, padding: '9px 12px', fontSize: 13, cursor: 'pointer' }}
        >
          <option value="" disabled>Change plan…</option>
          {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <a href={`mailto:${data.email}`} style={{ ...btn('#4F46E5'), textDecoration: 'none', display: 'inline-block' }}>Send Email</a>
      </div>
      {msg && <div style={{ fontSize: 12, color: '#34D399', marginBottom: 8 }}>{msg}</div>}

      {/* Team */}
      <SectionTitle>Team ({data.users.length})</SectionTitle>
      <Card>
        <Table head={['Name', 'Email', 'Role', 'Last Login']}>
          {data.users.map((u, i) => (
            <tr key={i} style={{ borderTop: '1px solid #1F2937' }}>
              <Td>{u.name}</Td><Td>{u.email}</Td><Td>{u.role}</Td><Td>{ago(u.lastLoginAt)}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Positions */}
      <SectionTitle>Positions ({data.positions.length})</SectionTitle>
      <Card>
        <Table head={['Title', 'Company', 'Status', 'Candidates', 'Created']}>
          {data.positions.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid #1F2937' }}>
              <Td>{p.title}</Td><Td>{p.company}</Td><Td><StatusBadge status={p.status} /></Td>
              <Td>{p.candidateCount}</Td><Td>{ago(p.createdAt)}</Td>
            </tr>
          ))}
          {data.positions.length === 0 && <tr><Td colSpan={5}><span style={{ color: '#64748B' }}>No positions.</span></Td></tr>}
        </Table>
      </Card>

      {/* Interviews */}
      <SectionTitle>Recent Interviews</SectionTitle>
      <Card>
        <Table head={['Candidate', 'Position', 'Score', 'Status', 'When']}>
          {data.interviews.map((i) => (
            <tr key={i.id} style={{ borderTop: '1px solid #1F2937' }}>
              <Td>{i.candidateName}</Td><Td>{i.position}</Td><Td>{i.score ?? '—'}</Td>
              <Td><StatusBadge status={i.status} /></Td><Td>{ago(i.at)}</Td>
            </tr>
          ))}
          {data.interviews.length === 0 && <tr><Td colSpan={5}><span style={{ color: '#64748B' }}>No interviews.</span></Td></tr>}
        </Table>
      </Card>
    </Shell>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 4 }}>{value}</div>
    </div>
  )
}
function btn(color: string): React.CSSProperties {
  return { fontSize: 13, fontWeight: 700, color: '#fff', background: color, border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer' }
}
