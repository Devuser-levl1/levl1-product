'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function WaitlistForm({ accent }: { accent: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) { toast.error('Enter a valid email'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, product: 'upword' }) })
      if (!res.ok) throw new Error()
      setDone(true); toast.success("You're on the list! We'll be in touch.")
    } catch { toast.error('Something went wrong — try again.') } finally { setSaving(false) }
  }

  if (done) return <div style={{ fontSize: 15, fontWeight: 700, color: accent }}>✓ You&apos;re on the waitlist. We&apos;ll email you when Upword opens.</div>

  const inp: React.CSSProperties = { padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 15, flex: 1, minWidth: 160 }
  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 520 }}>
      <input style={inp} placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      <input style={inp} type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit" disabled={saving} style={{ padding: '12px 22px', borderRadius: 10, border: 'none', background: accent, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{saving ? '…' : 'Join the waitlist'}</button>
    </form>
  )
}
