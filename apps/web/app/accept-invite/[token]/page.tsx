'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button, Field, Input, Alert, EmptyState, LoadingBlock } from '@/components/screen/ui'


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
      setTimeout(() => router.push('/interviews/login'), 2500)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-bg)' }}>
      <LoadingBlock label="Loading invitation…" />
    </div>
  )

  if (invalid) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-bg)', padding: 24 }}>
      <EmptyState icon={<AlertCircle size={22} />} title="Invalid or expired link"
        description="This invitation link has expired or is invalid. Please ask your team admin to resend the invite." />
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-bg)', padding: 24 }}>
      <div role="status">
        <EmptyState icon={<CheckCircle2 size={22} color="var(--lv-success)" />} title="Account created!" description="Redirecting you to login…" />
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-bg)', padding: 16 }}>
      <main className="lv-card" style={{ width: '100%', maxWidth: 440, padding: 'clamp(24px, 6vw, 40px)', boxShadow: 'var(--lv-shadow-md)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--lv-gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="white" fill="white" />
          </div>
          <span style={{ fontFamily: 'var(--lv-font-display)', fontSize: 17, fontWeight: 700, color: 'var(--lv-brand-text)' }}>Levl1</span>
        </div>

        <h1 className="lv-page-title" style={{ marginBottom: 8 }}>Accept Invitation</h1>
        <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
          You&apos;ve been invited to join <strong style={{ color: 'var(--lv-text)' }}>{info?.agencyName}</strong> on Levl1 as a{' '}
          <strong style={{ textTransform: 'capitalize', color: 'var(--lv-text)' }}>{info?.role}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Your Name">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required autoComplete="name" />
          </Field>
          <Field label="Email (from invite)">
            <Input value={info?.email ?? ''} readOnly style={{ background: 'var(--lv-surface-sunken)', color: 'var(--lv-text-muted)' }} />
          </Field>
          <Field label="Set Password" required>
            <div style={{ position: 'relative' }}>
              <Input required type={showPw ? 'text' : 'password'} style={{ paddingRight: 48 }} autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}
                className="lv-btn lv-btn--ghost lv-btn--sm lv-btn--icon"
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}>
                {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm Password" required>
            <Input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
          </Field>

          {error && <Alert tone="danger">{error}</Alert>}

          <Button type="submit" fullWidth loading={saving} style={{ height: 48, fontSize: 15, marginTop: 4 }}>
            {saving ? 'Creating account…' : 'Create Account & Join Team'}
          </Button>
        </form>
      </main>
    </div>
  )
}
