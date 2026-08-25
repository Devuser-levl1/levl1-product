'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function HireForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    // Always resolves to the same confirmation (no account enumeration).
    await fetch('/api/hire/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    setBusy(false); setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#F5F3FF,#fff)', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: 420, maxWidth: '100%', background: '#fff', border: '1px solid #E9E7F5', borderRadius: 18, padding: 32, boxShadow: '0 24px 60px rgba(109,40,217,0.10)' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#6D28D9', marginBottom: 18 }}>HirePilot</div>
        {sent ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Check your email</h1>
            <p style={{ fontSize: 14, color: '#64748B', margin: '10px 0 20px', lineHeight: 1.6 }}>If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password. The link expires in 1 hour.</p>
            <Link href="/hire/login" style={{ fontSize: 14, fontWeight: 700, color: '#6D28D9', textDecoration: 'none' }}>← Back to sign in</Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Forgot your password?</h1>
            <p style={{ fontSize: 13.5, color: '#94A3B8', margin: '6px 0 22px' }}>Enter your work email and we&apos;ll send you a reset link.</p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Work email</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', background: '#F8FAFC' }} />
              </div>
              <button type="submit" disabled={busy} style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 18px', fontSize: 15, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <div style={{ marginTop: 18 }}><Link href="/hire/login" style={{ fontSize: 13.5, fontWeight: 600, color: '#6D28D9', textDecoration: 'none' }}>← Back to sign in</Link></div>
          </>
        )}
      </div>
    </div>
  )
}
