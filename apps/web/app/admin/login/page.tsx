'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Invalid token')
      }
    } catch {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B1120', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'var(--font-sans)' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, background: '#111827', border: '1px solid #1F2937', borderRadius: 16, padding: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Levl1 Admin</div>
        <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Internal access only</div>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Admin token"
          autoFocus
          style={{ width: '100%', padding: '12px 14px', borderRadius: 9, border: '1px solid #374151', background: '#0B1120', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 12 }}
        />
        {error && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading || !token}
          style={{ width: '100%', padding: '12px', borderRadius: 9, border: 'none', background: token ? '#4F46E5' : '#374151', color: '#fff', fontSize: 14, fontWeight: 700, cursor: token && !loading ? 'pointer' : 'not-allowed' }}
        >
          {loading ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
