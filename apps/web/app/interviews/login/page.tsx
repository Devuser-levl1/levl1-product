'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Logo } from '@/components/marketing/logo'

const INDIGO = '#4F46E5'
const VIOLET = '#7C3AED'

// Email + one-time code login (passwords retired). Two steps: request a code,
// then verify it. On success the OTP-verify route issues the standard session.
export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Enter your work email.'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not send a code.'); setLoading(false); return }
      toast.success('Check your email for a 6-digit code')
      setStep('code'); setLoading(false)
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim().length < 6) { setError('Enter the 6-digit code.'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Verification failed.'); setLoading(false); return }
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#F5F7FF,#fff)', fontFamily: 'var(--font-sans)', padding: 24 }}>
      <div style={{ width: 420, maxWidth: '100%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 18, padding: 32, boxShadow: '0 24px 60px rgba(79,70,229,0.10)' }}>
        <Link href="/interviews" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 22, textDecoration: 'none' }}>
          <Logo variant="black" height={26} priority />
          <span style={{ fontSize: 15, fontWeight: 800, color: INDIGO }}>Interviews</span>
        </Link>

        <h1 style={{ fontSize: 23, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Sign in</h1>
        <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 22px' }}>
          {step === 'email' ? 'Enter your work email and we\'ll send you a one-time code.' : `We sent a 6-digit code to ${email}.`}
        </p>

        {step === 'email' ? (
          <form onSubmit={requestCode}>
            <label style={labelStyle}>Work email</label>
            <input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={inputStyle} />
            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6 }}>Personal email (Gmail, Outlook, etc.) isn&apos;t supported.</div>
            {error && <div style={errStyle}>{error}</div>}
            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <>Send code <ArrowRight size={16} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <label style={labelStyle}>6-digit code</label>
            <input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" style={{ ...inputStyle, letterSpacing: 8, fontSize: 20, textAlign: 'center', fontWeight: 700 }} />
            {error && <div style={errStyle}>{error}</div>}
            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <>Verify &amp; sign in <ArrowRight size={16} /></>}
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError('') }} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer' }}>← Use a different email</button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: '#64748B' }}>
          New to Levl1? <Link href="/interviews/signup" style={{ color: INDIGO, fontWeight: 700 }}>Create an account</Link>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none' }
const errStyle: React.CSSProperties = { fontSize: 13, color: '#DC2626', marginTop: 10, fontWeight: 600 }
function btnStyle(loading: boolean): React.CSSProperties {
  return { width: '100%', marginTop: 18, padding: '12px', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer', color: '#fff', fontWeight: 700, fontSize: 14.5, background: `linear-gradient(135deg,${INDIGO},${VIOLET})`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
}
