'use client'

import { useEffect, useState } from 'react'
import { Shell, Card, Table, Td, ago } from '../ui'

interface Lead { id: string; name: string; email: string; role: string; marketingConsent: boolean; at: string }

export default function AdminDemoLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/demo-leads')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.leads) setLeads(d.leads) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>Demo Leads</h1>
        <span style={{ fontSize: 13, color: '#64748B' }}>{leads.length} captured</span>
        <a href="/api/admin/demo-leads?format=csv" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#A5B4FC', background: 'rgba(99,102,241,0.12)', border: '1px solid #374151', borderRadius: 8, padding: '8px 14px', textDecoration: 'none' }}>↓ Export CSV</a>
      </div>

      <Card>
        <Table head={['Name', 'Work email', 'Role tried', 'Consent', 'When']}>
          {leads.map((l) => (
            <tr key={l.id} style={{ borderTop: '1px solid #1F2937' }}>
              <Td>{l.name}</Td>
              <Td><a href={`mailto:${l.email}`} style={{ color: '#A5B4FC', textDecoration: 'none' }}>{l.email}</a></Td>
              <Td>{l.role}</Td>
              <Td>{l.marketingConsent ? '✅ opted in' : '—'}</Td>
              <Td>{ago(l.at)}</Td>
            </tr>
          ))}
          {!loading && leads.length === 0 && (
            <tr><Td colSpan={5}><span style={{ color: '#64748B' }}>No demo leads captured yet.</span></Td></tr>
          )}
        </Table>
      </Card>
    </Shell>
  )
}
