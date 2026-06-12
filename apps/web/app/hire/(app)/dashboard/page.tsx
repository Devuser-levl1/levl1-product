'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Dash { pipeline: { openTotal: number; openCount: number; byStage: Record<string, number>; wonMtd: number }; recent: { kind: string; text: string; at: string }[] }
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }

export default function HireDashboard() {
  const router = useRouter()
  const [d, setD] = useState<Dash | null>(null)
  useEffect(() => { fetch('/api/hire/dashboard').then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {}) }, [])

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 18px' }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Open Pipeline</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{d ? inr(d.pipeline.openTotal) : '—'}</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{d ? `across ${d.pipeline.openCount} deals` : ''}</div>
          {d && (
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>
              {Object.entries(d.pipeline.byStage).map(([s, n]) => `${s}: ${n}`).join('  ·  ') || 'No open deals'}
            </div>
          )}
          <button onClick={() => router.push('/hire/crm')} style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View Pipeline →</button>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Won (this month)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{d ? inr(d.pipeline.wonMtd) : '—'}</div>
        </div>
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Recent Activity</div>
        {!d || d.recent.length === 0 ? <div style={{ fontSize: 13, color: '#94A3B8' }}>No recent activity.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.recent.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: '#475569' }}>
                <span style={{ color: '#CBD5E1', marginRight: 6 }}>•</span>{r.text}
                <span style={{ color: '#CBD5E1', fontSize: 11, marginLeft: 6 }}>{new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
