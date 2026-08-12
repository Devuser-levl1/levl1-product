'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ROLE_LABEL } from '@/lib/hire/roles'

interface Me { user: { id: string; name: string; email: string; role: string } }

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', background: '#fff' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 6 }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 16 }

export default function AccountSettings() {
  const [me, setMe] = useState<Me | null>(null)
  useEffect(() => { fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => {}) }, [])

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/hire/settings" style={{ fontSize: 13, color: '#6D28D9', textDecoration: 'none', fontWeight: 600 }}>← Settings</Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '8px 0 2px' }}>Account</h1>
        <div style={{ fontSize: 13.5, color: '#64748B' }}>Your profile and password.</div>
      </div>

      {/* Profile (read-only) */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>Profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><div style={lbl}>Name</div><div style={{ fontSize: 14, color: '#0F172A' }}>{me?.user.name || '—'}</div></div>
          <div><div style={lbl}>Role</div><div style={{ fontSize: 14, color: '#0F172A' }}>{me ? (ROLE_LABEL[me.user.role] ?? me.user.role) : '—'}</div></div>
          <div style={{ gridColumn: '1 / -1' }}><div style={lbl}>Email</div><div style={{ fontSize: 14, color: '#0F172A' }}>{me?.user.email || '—'}</div></div>
        </div>
      </div>

      <ChangePassword />
    </div>
  )
}

function ChangePassword() {
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setOk(false)
    if (next.length < 8) { setErr('New password must be at least 8 characters.'); return }
    if (next !== confirm) { setErr('New passwords do not match.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/hire/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error ?? 'Could not change password.'); setBusy(false); return }
      setOk(true); setCur(''); setNext(''); setConfirm('')
    } catch { setErr('Something went wrong. Please try again.') }
    setBusy(false)
  }

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Change password</div>
      <div style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 14 }}>Enter your current password, then choose a new one (min 8 characters).</div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={lbl}>Current password</label>
          <input required type={show ? 'text' : 'password'} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" style={inp} />
        </div>
        <div>
          <label style={lbl}>New password</label>
          <input required type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" style={inp} />
        </div>
        <div>
          <label style={lbl}>Confirm new password</label>
          <input required type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" style={inp} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#64748B', cursor: 'pointer' }}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
        </label>
        {err && <div style={{ fontSize: 13, color: '#DC2626', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 12px' }}>{err}</div>}
        {ok && <div style={{ fontSize: 13, color: '#059669', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 8, padding: '10px 12px' }}>✓ Password updated. Use it next time you sign in.</div>}
        <div>
          <button type="submit" disabled={busy} style={{ background: '#6D28D9', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Updating…' : 'Update password'}</button>
        </div>
      </form>
    </div>
  )
}
