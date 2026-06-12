'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/hire/auth-shell'

const inp: React.CSSProperties = { padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0B1120', color: '#fff', fontSize: 14, outline: 'none' }

export default function HireLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/hire/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Login failed'); setLoading(false); return }
      router.push('/hire/dashboard')
    } catch { setError('Something went wrong'); setLoading(false) }
  }

  return <AuthShell title="Sign in to your account" footer={<>New here? <Link href="/hire/signup" style={{ color: '#818CF8' }}>Start a free trial</Link></>}>
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input value={email} type="email" placeholder="Work email" onChange={(e) => setEmail(e.target.value)} style={inp} />
      <input value={password} type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} style={inp} />
      {error && <div style={{ color: '#F87171', fontSize: 13 }}>{error}</div>}
      <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer' }}>{loading ? 'Please wait…' : 'Sign in'}</button>
    </form>
  </AuthShell>
}
