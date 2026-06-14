'use client'
import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { HIRE_PLANS } from '@/lib/hire/plans'
import { startHireUpgrade } from '@/components/hire/upgrade-wall'

interface Status {
  plan: string; planName: string; trialActive: boolean; trialDaysLeft: number | null; subscriptionStatus: string | null; currentPeriodEnd: string | null
  limits: { recruiters: number; activeJobs: number; candidatesPerMonth: number; aiInterviewsPerMonth: number }
  usage: { candidates: number; interviews: number; activeJobs: number; seats: number }
  history: { date: string; planId: string; amount: number; status: string }[]
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24 }

export default function BillingPage() {
  const [s, setS] = useState<Status | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => { fetch('/api/hire/billing/status').then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  // Return from Cashfree checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('order_id'); const plan = params.get('plan')
    if (orderId) {
      fetch(`/api/hire/billing/verify/${orderId}${plan ? `?plan=${plan}` : ''}`).then((r) => r.json()).then((v) => {
        if (v.paid) { toast.success('Payment confirmed — plan upgraded!'); load() } else toast.error('Payment not confirmed yet.')
      }).catch(() => {})
      window.history.replaceState({}, '', '/hire/settings/billing')
    }
  }, [load])

  async function upgrade(planId: string) { setBusy(planId); await startHireUpgrade(planId, load); setBusy(null) }

  if (!s) return <div style={{ color: '#94A3B8' }}>Loading…</div>

  const bar = (used: number, limit: number) => {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
    const color = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#4F46E5'
    return { pct, color }
  }
  const Row = ({ label, used, limit }: { label: string; used: number; limit: number }) => {
    const { pct, color } = bar(used, limit)
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span style={{ color: '#334155' }}>{label}</span><span style={{ color, fontWeight: 600 }}>{used} / {limit}{pct >= 100 ? ' · at limit' : ''}</span></div>
        <div style={{ height: 10, borderRadius: 5, background: '#F1F5F9', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: color }} /></div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 18px' }}>Billing &amp; Plan</h1>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div><div style={{ fontSize: 12, color: '#94A3B8', textTransform: 'uppercase' }}>Current plan</div><div style={{ fontSize: 20, fontWeight: 800 }}>{s.trialActive ? 'Trial' : s.planName}</div></div>
          {s.trialActive && s.trialDaysLeft != null && <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: s.trialDaysLeft <= 2 ? '#DC2626' : s.trialDaysLeft <= 5 ? '#D97706' : '#059669' }}>Trial ends in {s.trialDaysLeft} day{s.trialDaysLeft !== 1 ? 's' : ''}</div>}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>Usage this month</div>
        <Row label="Candidates" used={s.usage.candidates} limit={s.limits.candidatesPerMonth} />
        <Row label="Active jobs" used={s.usage.activeJobs} limit={s.limits.activeJobs} />
        <Row label="Recruiter seats" used={s.usage.seats} limit={s.limits.recruiters} />
      </div>

      <div style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Choose a plan</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="bill-grid">
        {Object.values(HIRE_PLANS).map((p) => {
          const current = !s.trialActive && s.plan === p.id
          return (
            <div key={p.id} style={{ ...card, padding: 20, border: `1px solid ${'popular' in p && p.popular ? '#4F46E5' : '#E2E8F0'}` }}>
              {'popular' in p && p.popular && <div style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', marginBottom: 4 }}>★ Recommended</div>}
              <div style={{ fontSize: 17, fontWeight: 800 }}>{p.name}</div>
              <div style={{ margin: '6px 0 12px' }}><span style={{ fontSize: 22, fontWeight: 800 }}>{p.priceDisplay}</span><span style={{ fontSize: 13, color: '#94A3B8' }}>/mo</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>{p.features.slice(0, 5).map((f) => <div key={f} style={{ fontSize: 12, color: '#475569' }}>✓ {f}</div>)}</div>
              <button onClick={() => upgrade(p.id)} disabled={current || busy === p.id} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: current ? '#F1F5F9' : '#4F46E5', color: current ? '#94A3B8' : '#fff', fontWeight: 700, cursor: current ? 'default' : 'pointer' }}>{current ? 'Current plan' : busy === p.id ? '…' : 'Upgrade'}</button>
            </div>
          )
        })}
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Billing history</div>
        {s.history.length === 0 ? <div style={{ fontSize: 13, color: '#94A3B8' }}>No payments yet.</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>{['Date', 'Plan', 'Amount', 'Status'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}</tr></thead>
            <tbody>{s.history.map((h, i) => <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}><td style={{ padding: '8px' }}>{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td style={{ padding: '8px' }}>{h.planId}</td><td style={{ padding: '8px' }}>₹{(h.amount / 100).toLocaleString('en-IN')}</td><td style={{ padding: '8px', color: '#10B981' }}>{h.status}</td></tr>)}</tbody>
          </table>
        )}
      </div>
      <style>{`@media (max-width:760px){ .bill-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  )
}
