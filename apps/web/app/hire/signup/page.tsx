'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/hire/auth-shell'

const inp: React.CSSProperties = { padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0B1120', color: '#fff', fontSize: 14, outline: 'none' }

export default function HireSignup() {
  const router = useRouter()
  const [form, setForm] = useState({ tenantName: '', tenantType: 'AGENCY', name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/hire/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Signup failed'); setLoading(false); return }
      router.push('/hire/onboarding')
    } catch { setError('Something went wrong'); setLoading(false) }
  }

  return <AuthShell title="Start your free trial" footer={<>Already have an account? <Link href="/hire/login" style={{ color: '#A78BFA' }}>Sign in</Link></>}>
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input placeholder="Agency / company name" value={form.tenantName} onChange={(e) => set('tenantName', e.target.value)} style={inp} />
      <select value={form.tenantType} onChange={(e) => set('tenantType', e.target.value)} style={inp}>
        <option value="AGENCY">Staffing agency</option>
        <option value="CORPORATE">In-house HR team</option>
      </select>
      <input placeholder="Your name" value={form.name} onChange={(e) => set('name', e.target.value)} style={inp} />
      <input placeholder="Work email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} style={inp} />
      <input placeholder="Password (8+ characters)" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} style={inp} />
      {error && <div style={{ color: '#F87171', fontSize: 13 }}>{error}</div>}
      <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer' }}>{loading ? 'Please wait…' : 'Create account'}</button>
    </form>
  </AuthShell>
}
