'use client'
import { useEffect, useState, useCallback } from 'react'
import { Alert, LoadingBlock } from '@/components/screen/ui'

// Levl1 account — one login, both products. Shows entitlements and offers the
// one-time "connect your other Levl1 product" link (verified by email match).

interface Me {
  email: string
  entitlements: { hire: boolean; interviews: boolean }
  available: { hire: boolean; interviews: boolean }
  linked: { hire: boolean; interviews: boolean }
}

const card: React.CSSProperties = { background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 22, marginBottom: 16 }
const pill = (on: boolean) => ({ fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '3px 10px', color: on ? 'var(--lv-success)' : 'var(--lv-text-muted)', background: on ? 'color-mix(in srgb, var(--lv-success) 10%, transparent)' : 'var(--lv-surface-muted)' })

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgTone, setMsgTone] = useState<'success' | 'danger'>('success')
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(() => {
    setLoadFailed(false)
    fetch('/api/levl/me').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.email) setMe(d); else setLoadFailed(true) }).catch(() => setLoadFailed(true))
  }, [])
  useEffect(() => { load() }, [load])

  async function link() {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/levl/link', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setMsgTone('danger'); setMsg(d.error ?? 'Could not link'); return }
      setMsgTone('success'); setMsg('Connected. Both products are now available with this login.')
      load()
    } finally { setBusy(false) }
  }

  if (!me) return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
      {loadFailed
        ? <Alert tone="danger" title="Couldn't load your account" action={<button type="button" className="lv-btn lv-btn--secondary lv-btn--sm" onClick={load}>Retry</button>}>Check your connection and try again.</Alert>
        : <LoadingBlock label="Loading your account…" />}
    </div>
  )

  // The "other" product is linkable when an identity exists for this email but
  // isn't yet entitled here.
  const canLink = (me.available.hire && !me.entitlements.hire) || (me.available.interviews && !me.entitlements.interviews)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 4px' }}>Your Levl1 account</h1>
      <p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: '0 0 24px' }}>{me.email} — one login works across the Levl1 products you&apos;re entitled to.</p>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 12 }}>Product access</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--lv-text-body)' }}>HirePilot</span>
            <span style={pill(me.entitlements.hire)}>{me.entitlements.hire ? 'Active' : 'Not connected'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--lv-text-body)' }}>Levl1 Interviews</span>
            <span style={pill(me.entitlements.interviews)}>{me.entitlements.interviews ? 'Active' : 'Not connected'}</span>
          </div>
        </div>
      </div>

      {canLink && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 4 }}>Connect your other Levl1 product</div>
          <div style={{ fontSize: 13, color: 'var(--lv-text-body)', marginBottom: 14 }}>We found another Levl1 account under <strong>{me.email}</strong>. Connect it to use both products with this single login.</div>
          <button className="lv-btn lv-btn--primary lv-btn--sm" onClick={link} disabled={busy}>{busy ? 'Connecting…' : 'Connect & verify by email'}</button>
        </div>
      )}

      {msg && <Alert tone={msgTone}>{msg}</Alert>}
    </div>
  )
}
