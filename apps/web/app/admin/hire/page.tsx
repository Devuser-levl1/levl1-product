'use client'
import { useEffect, useState, useCallback } from 'react'
import { Shell, Card, Table, Td, PlanBadge, ago } from '../ui'

interface HT { id: string; name: string; type: string; plan: string; trialActive: boolean; trialEndsAt: string | null; subscriptionStatus: string | null; usageCandidates: number; usageInterviews: number; users: number; jobs: number; candidates: number; createdAt: string }

export default function AdminHire() {
  const [list, setList] = useState<HT[]>([])
  const load = useCallback(() => { fetch('/api/admin/hire-tenants').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setList(d)).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  async function extend(id: string) { await fetch(`/api/admin/hire-tenants/${id}/extend-trial`, { method: 'POST' }); load() }
  async function changePlan(id: string, plan: string) { if (!plan) return; await fetch(`/api/admin/hire-tenants/${id}/change-plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) }); load() }

  return (
    <Shell>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>Levl1 Hire — Tenants</h1>
      <Card>
        <Table head={['Agency', 'Type', 'Plan', 'Trial', 'Usage (cand/int)', 'Users/Jobs', 'Joined', 'Actions']}>
          {list.map((t) => (
            <tr key={t.id} style={{ borderTop: '1px solid #1F2937' }}>
              <Td>{t.name}</Td>
              <Td>{t.type}</Td>
              <Td><PlanBadge plan={t.trialActive ? 'trial' : t.plan.toLowerCase()} /></Td>
              <Td>{t.trialActive ? (t.trialEndsAt ? `ends ${ago(t.trialEndsAt)}` : 'active') : (t.subscriptionStatus ?? '—')}</Td>
              <Td>{t.usageCandidates}/{t.usageInterviews}</Td>
              <Td>{t.users}/{t.jobs}</Td>
              <Td>{ago(t.createdAt)}</Td>
              <Td>
                <button onClick={() => extend(t.id)} style={{ fontSize: 11, marginRight: 6, background: 'none', border: '1px solid #374151', borderRadius: 6, padding: '4px 8px', color: '#94A3B8', cursor: 'pointer' }}>+14d</button>
                <select onChange={(e) => changePlan(t.id, e.target.value)} defaultValue="" style={{ fontSize: 11, background: '#0B1120', color: '#E2E8F0', border: '1px solid #374151', borderRadius: 6, padding: '4px' }}>
                  <option value="" disabled>Plan…</option>{['STARTER', 'GROWTH', 'SCALE'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Td>
            </tr>
          ))}
          {list.length === 0 && <tr><Td colSpan={8}><span style={{ color: '#64748B' }}>No Hire tenants yet.</span></Td></tr>}
        </Table>
      </Card>
    </Shell>
  )
}
