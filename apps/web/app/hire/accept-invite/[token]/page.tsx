'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AuthShell } from '@/components/hire/auth-shell'

const inp: React.CSSProperties = { padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0B1120', color: '#fff', fontSize: 14, outline: 'none' }

export default function HireAcceptInvite() {
  const router = useRouter()
  const params = useParams()
  const token = String(params?.token ?? '')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/hire/team/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name, password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not accept invite'); setLoading(false); return }
      router.replace('/hire/dashboard')
    } catch { setError('Something went wrong'); setLoading(false) }
  }

  if (!token) return <AuthShell title="Invalid invite link"><div style={{ color: '#94A3B8', fontSize: 14 }}>This invite link is missing its token.</div></AuthShell>
  return <AuthShell title="Accept your invite & set a password">
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input value={name} placeholder="Your name (optional)" onChange={(e) => setName(e.target.value)} style={inp} />
      <input value={password} type="password" placeholder="Choose a password (8+ characters)" onChange={(e) => setPassword(e.target.value)} style={inp} />
      {error && <div style={{ color: '#F87171', fontSize: 13 }}>{error}</div>}
      <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer' }}>{loading ? 'Please wait…' : 'Join the team'}</button>
    </form>
  </AuthShell>
}
