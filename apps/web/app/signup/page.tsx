'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Field, Input, Alert } from '@/components/screen/ui'

// Design-System Pass 3 (group 6b): form on canonical fields/buttons; the
// two-step passwordless signup flow is unchanged.

const PERKS = [
  '5 free AI interviews — no credit card',
  '14-day full access trial',
  'AI question generation per role',
  'Evaluation reports in minutes',
]

export default function SignupPage() {
  const router = useRouter()

  const [agencyName, setAgencyName] = useState('')
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [phone,      setPhone]      = useState('')
  const [code,       setCode]       = useState('')
  const [step,       setStep]       = useState<'details' | 'code'>('details')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // Passwordless, two steps (same endpoint): details → we email a 6-digit code →
  // verify → the account is created and you're signed in.
  const submit = async (withCode: boolean) => {
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agencyName, name, email, phone, ...(withCode ? { code } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Signup failed'); setLoading(false); return }

      if (!withCode) {
        toast.success('Check your email for a 6-digit code')
        setStep('code'); setLoading(false)
        return
      }
      toast.success('Account created! Setting up your workspace…')
      router.push('/onboarding')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); void submit(false) }
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length < 6) { setError('Enter the 6-digit code.'); return }
    void submit(true)
  }

  return (
    <div
      className="login-grid"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}
    >
      {/* ── LEFT: Form ── */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 60px', background: 'var(--lv-surface)', overflowY: 'auto' }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 40 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--lv-gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}>
              <Zap size={16} color="white" strokeWidth={2.5} fill="white" />
            </div>
            <span style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 18, fontWeight: 600, color: 'var(--lv-text)' }}>Levl1</span>
          </Link>

          <h1 style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 28, fontWeight: 600, color: 'var(--lv-text)', letterSpacing: '-0.025em', marginBottom: 6 }}>
            Start your free trial
          </h1>
          <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', marginBottom: 32, lineHeight: 1.5 }}>
            {step === 'details' ? '5 interviews · 14 days · No credit card required' : `We sent a 6-digit code to ${email}. Enter it to create your account.`}
          </p>

          {step === 'code' ? (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="6-digit code">
                <Input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} style={{ letterSpacing: 8, fontSize: 18, textAlign: 'center', fontWeight: 600, height: 52 }}
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
              </Field>
              {error && <Alert tone="danger">{error}</Alert>}
              <Button type="submit" fullWidth loading={loading} rightIcon={<ArrowRight size={16} />} style={{ height: 48, fontSize: 16, marginTop: 4 }}>
                {loading ? 'Creating your account…' : 'Verify & create account'}
              </Button>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Button variant="tertiary" size="sm" onClick={() => { setStep('details'); setCode(''); setError('') }}>← Edit details</Button>
                <Button variant="tertiary" size="sm" disabled={loading} onClick={() => { setCode(''); void submit(false) }}>Resend code</Button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Agency / Company name" required>
              <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="HireEdge Recruitment" autoComplete="organization" />
            </Field>
            <Field label="Your name" required>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" autoComplete="name" />
            </Field>
            <Field label="Work email" required hint={<>Use your company email — personal addresses (Gmail, Outlook, etc.) aren&apos;t supported. We&apos;ll email you a code to verify it.</>}>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@hireedge.in" autoComplete="email" />
            </Field>
            <Field label="Phone (optional)">
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" autoComplete="tel" />
            </Field>

            {error && <Alert tone="danger">{error}</Alert>}

            <Button type="submit" fullWidth loading={loading} rightIcon={<ArrowRight size={16} />} style={{ height: 48, fontSize: 16, marginTop: 4 }}>
              {loading ? 'Sending your code…' : 'Continue'}
            </Button>

            <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              By signing up you agree to our{' '}
              <Link href="/terms" style={{ color: 'var(--lv-brand-text)', textDecoration: 'underline' }}>Terms</Link> and{' '}
              <Link href="/privacy" style={{ color: 'var(--lv-brand-text)', textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>
          </form>
          )}

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 24 }}>
            Already have an account?{' '}
            <Link href="/interviews/login" style={{ color: 'var(--lv-brand-text)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT: Value prop panel ── */}
      <div
        className="login-right-panel"
        style={{ background: 'var(--lv-surface-sunken)', borderLeft: '1px solid var(--lv-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--lv-surface)', borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--lv-text-body)', marginBottom: 28, border: '1px solid var(--lv-border)' }}>
            Free trial — no credit card needed
          </div>

          <h2 style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 32, fontWeight: 600, color: 'var(--lv-text)', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.02em' }}>
            AI interviews in<br />minutes, not weeks
          </h2>
          <p style={{ fontSize: 16, color: 'var(--lv-text-muted)', lineHeight: 1.7, marginBottom: 36 }}>
            Screen candidates 10× faster with Ananya, your AI interviewer. Get structured evaluations before the first human call.
          </p>

          {/* Perks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PERKS.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={16} color="var(--lv-text-muted)" />
                <span style={{ fontSize: 15, color: 'var(--lv-text-body)', fontWeight: 400 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-right-panel { display: none !important; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
