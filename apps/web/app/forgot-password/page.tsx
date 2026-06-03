'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      setSent(true)
      toast.success('If that email exists, a reset link has been sent')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const INPUT: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)',
    outline: 'none', boxSizing: 'border-box', background: '#F8FAFC',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
        {/* Logo */}
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 36 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="white" fill="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        </Link>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 10 }}>Check your inbox</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 24 }}>
              If <strong>{email}</strong> has an account, we&apos;ve sent a password reset link. It expires in 1 hour.
            </p>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#7C3AED', fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#4F46E5', marginBottom: 8 }}>
              Reset your password
            </h1>
            <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 28, lineHeight: 1.6 }}>
              Enter your work email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Email address</label>
                <input required type="email" style={INPUT} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
              </div>
              <button type="submit" disabled={loading}
                style={{ background: loading ? '#94A3B8' : 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', boxShadow: loading ? 'none' : '0 4px 14px rgba(124,58,237,0.28)' }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>
                <ArrowLeft size={13} /> Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
