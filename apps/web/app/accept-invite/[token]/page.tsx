'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)',
  outline: 'none', boxSizing: 'border-box', background: '#F8FAFC',
}

interface InviteInfo {
  name: string
  email: string
  role: string
  agencyName: string
}

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token  = params.token as string

  const [info,    setInfo]    = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [done,    setDone]    = useState(false)

  const [name,     setName]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch(`/api/accept-invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setInvalid(true); return }
        setInfo(data)
        setName(data.name ?? '')
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setError('')
    setSaving(true)
    try {
      const res  = await fetch(`/api/accept-invite/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <Loader2 size={32} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (invalid) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Invalid or expired link</h2>
        <p style={{ color: '#94A3B8', fontSize: 14 }}>This invitation link has expired or is invalid. Please ask your team admin to resend the invite.</p>
      </div>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Account created!</h2>
        <p style={{ color: '#94A3B8', fontSize: 14 }}>Redirecting you to login…</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="white" fill="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
          Accept Invitation
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28, lineHeight: 1.6 }}>
          You&apos;ve been invited to join <strong>{info?.agencyName}</strong> on Levl1 as a{' '}
          <strong style={{ textTransform: 'capitalize' }}>{info?.role}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 5 }}>Your Name</label>
            <input style={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 5 }}>Email (from invite)</label>
            <input style={{ ...INPUT, background: '#F1F5F9', color: '#94A3B8' }} value={info?.email ?? ''} readOnly />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 5 }}>Set Password *</label>
            <div style={{ position: 'relative' }}>
              <input required type={showPw ? 'text' : 'password'} style={{ ...INPUT, paddingRight: 44 }}
                value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 0 }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 5 }}>Confirm Password *</label>
            <input required type="password" style={INPUT} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#DC2626', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={saving}
            style={{ background: saving ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: saving ? 'none' : '0 4px 14px rgba(124,58,237,0.30)', fontFamily: 'var(--font-sans)', marginTop: 4 }}>
            {saving ? 'Creating account…' : 'Create Account & Join Team'}
          </button>
        </form>
      </div>
    </div>
  )
}
