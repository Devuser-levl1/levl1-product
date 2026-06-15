'use client'
import { useEffect, useState, useCallback } from 'react'

// Levl1 account — one login, both products. Shows entitlements and offers the
// one-time "connect your other Levl1 product" link (verified by email match).

interface Me {
  email: string
  entitlements: { hire: boolean; interviews: boolean }
  available: { hire: boolean; interviews: boolean }
  linked: { hire: boolean; interviews: boolean }
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22, marginBottom: 16 }
const btn: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const pill = (on: boolean) => ({ fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '3px 10px', color: on ? '#059669' : '#94A3B8', background: on ? 'rgba(5,150,105,0.1)' : '#F1F5F9' })

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    fetch('/api/levl/me').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.email) setMe(d) }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  async function link() {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/levl/link', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setMsg(d.error ?? 'Could not link'); return }
      setMsg('Connected. Both products are now available with this login.')
      load()
    } finally { setBusy(false) }
  }

  if (!me) return <div style={{ maxWidth: 640, margin: '0 auto', padding: 40, color: '#475569' }}>Loading…</div>

  // The "other" product is linkable when an identity exists for this email but
  // isn't yet entitled here.
  const canLink = (me.available.hire && !me.entitlements.hire) || (me.available.interviews && !me.entitlements.interviews)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Your Levl1 account</h1>
      <p style={{ fontSize: 13, color: '#475569', margin: '0 0 24px' }}>{me.email} — one login works across the Levl1 products you&apos;re entitled to.</p>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>Product access</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#334155' }}>Levl1 Hire</span>
            <span style={pill(me.entitlements.hire)}>{me.entitlements.hire ? 'Active' : 'Not connected'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#334155' }}>Levl1 Interviews</span>
            <span style={pill(me.entitlements.interviews)}>{me.entitlements.interviews ? 'Active' : 'Not connected'}</span>
          </div>
        </div>
      </div>

      {canLink && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Connect your other Levl1 product</div>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>We found another Levl1 account under <strong>{me.email}</strong>. Connect it to use both products with this single login.</div>
          <button style={btn} onClick={link} disabled={busy}>{busy ? 'Connecting…' : 'Connect & verify by email'}</button>
        </div>
      )}

      {msg && <div style={{ ...card, borderColor: '#A7F3D0', background: '#ECFDF5', color: '#065F46', fontSize: 13 }}>{msg}</div>}
    </div>
  )
}
