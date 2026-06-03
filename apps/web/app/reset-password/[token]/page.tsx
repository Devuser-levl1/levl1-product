'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const params  = useParams()
  const router  = useRouter()
  const token   = params.token as string

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  const INPUT: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)',
    outline: 'none', boxSizing: 'border-box', background: '#F8FAFC',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Reset failed'); return }
      setDone(true)
      toast.success('Password updated!')
      setTimeout(() => router.push('/dashboard'), 1800)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 36 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="white" fill="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        </Link>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>Password updated!</h2>
            <p style={{ fontSize: 14, color: '#64748B' }}>Redirecting to your dashboard…</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#4F46E5', marginBottom: 8 }}>
              Set new password
            </h1>
            <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 28 }}>At least 8 characters.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>New password</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showPw ? 'text' : 'password'} style={{ ...INPUT, paddingRight: 44 }}
                    value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 0 }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Confirm password</label>
                <input required type="password" style={INPUT} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
              </div>
              {error && (
                <p style={{ fontSize: 13, color: '#DC2626', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading}
                style={{ background: loading ? '#94A3B8' : 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', marginTop: 4, boxShadow: loading ? 'none' : '0 4px 14px rgba(124,58,237,0.28)' }}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
