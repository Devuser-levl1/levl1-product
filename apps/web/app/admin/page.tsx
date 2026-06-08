'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shell, Metric, SectionTitle, Card, Table, Td, PlanBadge, StatusBadge, inr, ago } from './ui'

interface Stats {
  mrr: number
  agencyCount: number
  interviewsTotal: number
  trialActive: number
  recentActivity: { id: string; candidateName: string; position: string; agency: string; score: number | null; status: string; at: string }[]
}
interface AgencyRow {
  id: string; name: string; plan: string; interviewsUsed: number; interviewsLimit: number
  mrr: number; lastActive: string | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [agencies, setAgencies] = useState<AgencyRow[]>([])

  useEffect(() => {
    fetch('/api/admin/stats').then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => {})
    fetch('/api/admin/agencies').then((r) => (r.ok ? r.json() : null)).then((d) => Array.isArray(d) && setAgencies(d)).catch(() => {})
  }, [])

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <Shell onSignOut={signOut}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        <Metric label="MRR" value={stats ? inr(stats.mrr) : '—'} />
        <Metric label="Agencies" value={stats ? String(stats.agencyCount) : '—'} />
        <Metric label="Interviews" value={stats ? `${stats.interviewsTotal} total` : '—'} />
        <Metric label="Trial" value={stats ? `${stats.trialActive} active` : '—'} />
      </div>

      <SectionTitle>Agencies</SectionTitle>
      <Card>
        <Table head={['Agency', 'Plan', 'Used/Limit', 'Last Active', 'MRR', '']}>
          {agencies.map((a) => (
            <tr key={a.id} style={{ borderTop: '1px solid #1F2937' }}>
              <Td><Link href={`/admin/agencies/${a.id}`} style={{ color: '#A5B4FC', fontWeight: 600, textDecoration: 'none' }}>{a.name}</Link></Td>
              <Td><PlanBadge plan={a.plan} /></Td>
              <Td>{a.interviewsUsed}/{a.interviewsLimit}</Td>
              <Td>{ago(a.lastActive)}</Td>
              <Td>{a.mrr > 0 ? inr(a.mrr) : '—'}</Td>
              <Td><Link href={`/admin/agencies/${a.id}`} style={{ color: '#64748B', textDecoration: 'none' }}>›</Link></Td>
            </tr>
          ))}
          {agencies.length === 0 && (
            <tr><Td colSpan={6}><span style={{ color: '#64748B' }}>No agencies yet.</span></Td></tr>
          )}
        </Table>
      </Card>

      <SectionTitle>Recent Activity</SectionTitle>
      <Card>
        <Table head={['Candidate', 'Position', 'Agency', 'Score', 'Status', 'When']}>
          {stats?.recentActivity.map((i) => (
            <tr key={i.id} style={{ borderTop: '1px solid #1F2937' }}>
              <Td>{i.candidateName}</Td>
              <Td>{i.position}</Td>
              <Td>{i.agency}</Td>
              <Td>{i.score ?? '—'}</Td>
              <Td><StatusBadge status={i.status} /></Td>
              <Td>{ago(i.at)}</Td>
            </tr>
          ))}
          {(!stats || stats.recentActivity.length === 0) && (
            <tr><Td colSpan={6}><span style={{ color: '#64748B' }}>No interviews yet.</span></Td></tr>
          )}
        </Table>
      </Card>
    </Shell>
  )
}
