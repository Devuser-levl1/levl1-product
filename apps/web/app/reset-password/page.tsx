'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Shell><div style={{ color: '#64748B' }}>Loading…</div></Shell>}>
      <ResetInner />
    </Suspense>
  )
}

function ResetInner() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return }
    if (pw !== confirm) { setErr('Passwords do not match.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/hire/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: pw }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error ?? 'Could not reset password.'); setSaving(false); return }
      setDone(true)
      setTimeout(() => router.push('/hire/login'), 1600)
    } catch { setErr('Something went wrong. Please try again.'); setSaving(false) }
  }

  if (!token) return (
    <Shell>
      <h1 style={h1}>Reset link needed</h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '8px 0 20px' }}>This page needs a valid reset link. Request a new one from the login page.</p>
      <Link href="/hire/forgot-password" style={linkBtn}>Request a reset link</Link>
    </Shell>
  )

  if (done) return (
    <Shell>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
        <h1 style={h1}>Password updated</h1>
        <p style={{ fontSize: 14, color: '#64748B', marginTop: 8 }}>Redirecting you to sign in…</p>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <h1 style={h1}>Set a new password</h1>
      <p style={{ fontSize: 13.5, color: '#94A3B8', margin: '6px 0 22px' }}>At least 8 characters.</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>New password</label>
          <div style={{ position: 'relative' }}>
            <input required type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" style={{ ...inp, paddingRight: 60 }} />
            <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6D28D9', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <div>
          <label style={lbl}>Confirm password</label>
          <input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" autoComplete="new-password" style={inp} />
        </div>
        {err && <div style={{ fontSize: 13, color: '#DC2626', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 12px' }}>{err}</div>}
        <button type="submit" disabled={saving} style={{ ...linkBtn, border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Updating…' : 'Update password'}</button>
      </form>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#F5F3FF,#fff)', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: 420, maxWidth: '100%', background: '#fff', border: '1px solid #E9E7F5', borderRadius: 18, padding: 32, boxShadow: '0 24px 60px rgba(109,40,217,0.10)' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#6D28D9', marginBottom: 18 }}>Levl1 Hire</div>
        {children}
      </div>
    </div>
  )
}

const h1: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', background: '#F8FAFC' }
const linkBtn: React.CSSProperties = { display: 'block', textAlign: 'center', background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', color: '#fff', borderRadius: 10, padding: '12px 18px', fontSize: 15, fontWeight: 700, textDecoration: 'none' }
