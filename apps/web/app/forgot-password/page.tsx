'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { ScreenLogo } from '@/components/screen/brand/ScreenLogo'

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
    border: '1px solid var(--lv-border)', fontSize: 14, fontFamily: 'var(--font-sans)',
    outline: 'none', boxSizing: 'border-box', background: 'var(--lv-surface-sunken)',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lv-surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: '40px', boxShadow: 'none' }}>
        {/* Logo */}
        <Link href="/interviews/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 36 }}>
          <ScreenLogo height={38} tone="auto" />
        </Link>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-surface-muted)', color: 'var(--lv-text-muted)' }}><Mail size={20} /></div>
            <h2 style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 10 }}>Check your inbox</h2>
            <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
              If <strong>{email}</strong> has an account, we&apos;ve sent a password reset link. It expires in 1 hour.
            </p>
            <Link href="/interviews/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--lv-text-muted)', fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 28, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 8 }}>
              Reset your password
            </h1>
            <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
              Enter your work email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--lv-text-body)', marginBottom: 6 }}>Email address</label>
                <input required type="email" style={INPUT} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
              </div>
              <button type="submit" disabled={loading}
                style={{ background: loading ? 'var(--lv-text-muted)' : 'var(--lv-gradient-brand)', color: '#fff', border: 'none', borderRadius: 6, padding: '13px 20px', fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', boxShadow: loading ? 'none' : '0 4px 14px color-mix(in srgb, var(--lv-accent) 28%, transparent)' }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Link href="/interviews/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--lv-text-muted)', textDecoration: 'none' }}>
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
