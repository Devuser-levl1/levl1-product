'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const PERKS = [
  '5 free AI interviews — no credit card',
  '14-day full access trial',
  'AI question generation per role',
  'Evaluation reports in minutes',
]

const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)',
  outline: 'none', boxSizing: 'border-box', background: '#F8FAFC',
  transition: 'border-color 0.15s',
}

export default function SignupPage() {
  const router = useRouter()

  const [agencyName, setAgencyName] = useState('')
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [phone,      setPhone]      = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)

    try {
      const res  = await fetch('/api/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agencyName, name, email, password, phone }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Signup failed'); setLoading(false); return }

      toast.success('Account created! Setting up your workspace…')
      router.push('/onboarding')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="login-grid"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}
    >
      {/* ── LEFT: Form ── */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 60px', background: '#fff', overflowY: 'auto' }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 40 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}>
              <Zap size={16} color="white" strokeWidth={2.5} fill="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
          </Link>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: '#1E293B', letterSpacing: '-0.025em', marginBottom: 6 }}>
            Start your free trial
          </h1>
          <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 32, lineHeight: 1.5 }}>
            5 interviews · 14 days · No credit card required
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 5 }}>Agency / Company name *</label>
              <input required style={INPUT} value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="HireEdge Recruitment" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 5 }}>Your name *</label>
              <input required style={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 5 }}>Work email *</label>
              <input required type="email" style={INPUT} value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@hireedge.in" autoComplete="email" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 5 }}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  required type={showPw ? 'text' : 'password'} style={{ ...INPUT, paddingRight: 44 }}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 5 }}>Phone (optional)</label>
              <input style={INPUT} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#DC2626', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '10px 14px' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: '#fff', border: 'none', borderRadius: 9, padding: '13px 20px',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, marginTop: 4, boxShadow: loading ? 'none' : '0 4px 14px rgba(124,58,237,0.30)',
              }}
            >
              {loading ? 'Creating your account…' : <><span>Start Free Trial</span><ArrowRight size={16} /></>}
            </button>

            <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6 }}>
              By signing up you agree to our{' '}
              <span style={{ color: '#7C3AED', cursor: 'pointer' }}>Terms</span> and{' '}
              <span style={{ color: '#7C3AED', cursor: 'pointer' }}>Privacy Policy</span>.
            </p>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: 24 }}>
            Already have an account?{' '}
            <Link href="/interviews/login" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT: Value prop panel ── */}
      <div
        className="login-right-panel"
        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', position: 'relative', overflow: 'hidden' }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 28, border: '1px solid rgba(255,255,255,0.20)' }}>
            ✦ Free trial — no credit card needed
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.03em' }}>
            AI interviews in<br />minutes, not weeks
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 36 }}>
            Screen candidates 10× faster with Ananya, your AI interviewer. Get structured evaluations before the first human call.
          </p>

          {/* Perks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PERKS.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={18} color="rgba(255,255,255,0.9)" />
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.90)', fontWeight: 500 }}>{p}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div style={{ marginTop: 48, padding: '20px 24px', background: 'rgba(255,255,255,0.10)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.18)' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', fontStyle: 'italic', lineHeight: 1.65, marginBottom: 12 }}>
              &ldquo;We onboarded Levl1 in a single afternoon. Within a week, we&apos;d screened more candidates than the previous month.&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>AM</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Ananya Mehta</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)' }}>Talent Director, SecureAxis</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-right-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
