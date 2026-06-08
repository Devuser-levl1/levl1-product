'use client'

import { useEffect, useMemo, useState } from 'react'
import { Shell, Card, Table, Td, StatusBadge, ago } from '../ui'

interface Row {
  id: string; candidateName: string; position: string; company: string
  agency: string; agencyId: string | null; score: number | null; status: string; at: string
}

const STATUSES = ['all', 'pending', 'invited', 'scheduled', 'interviewing', 'completed']

export default function AdminInterviewsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [status, setStatus] = useState('all')
  const [agency, setAgency] = useState('all')

  useEffect(() => {
    const qs = new URLSearchParams()
    if (status !== 'all') qs.set('status', status)
    fetch(`/api/admin/interviews?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => Array.isArray(d) && setRows(d))
      .catch(() => {})
  }, [status])

  const agencies = useMemo(() => {
    const m = new Map<string, string>()
    rows.forEach((r) => r.agencyId && m.set(r.agencyId, r.agency))
    return Array.from(m.entries())
  }, [rows])

  const filtered = agency === 'all' ? rows : rows.filter((r) => r.agencyId === agency)

  const selectStyle: React.CSSProperties = {
    background: '#111827', color: '#E2E8F0', border: '1px solid #374151',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer',
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>All Interviews</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>
        <select value={agency} onChange={(e) => setAgency(e.target.value)} style={selectStyle}>
          <option value="all">All agencies</option>
          {agencies.map(([aid, name]) => <option key={aid} value={aid}>{name}</option>)}
        </select>
        <div style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          {filtered.length} interviews
        </div>
      </div>

      <Card>
        <Table head={['Candidate', 'Position', 'Company', 'Agency', 'Score', 'Status', 'When']}>
          {filtered.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid #1F2937' }}>
              <Td>{r.candidateName}</Td>
              <Td>{r.position}</Td>
              <Td>{r.company}</Td>
              <Td>{r.agency}</Td>
              <Td>{r.score ?? '—'}</Td>
              <Td><StatusBadge status={r.status} /></Td>
              <Td>{ago(r.at)}</Td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><Td colSpan={7}><span style={{ color: '#64748B' }}>No interviews match.</span></Td></tr>
          )}
        </Table>
      </Card>
    </Shell>
  )
}
