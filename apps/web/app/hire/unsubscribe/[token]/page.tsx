'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function Unsubscribe() {
  const params = useParams()
  const token = String(params?.token ?? '')
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!token) { setState('error'); return }
    fetch(`/api/hire/unsubscribe/${token}`, { method: 'POST' }).then((r) => setState(r.ok ? 'done' : 'error')).catch(() => setState('error'))
  }, [token])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif', padding: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 36, maxWidth: 420, textAlign: 'center' }}>
        {state === 'loading' && <div style={{ color: '#64748B' }}>Processing…</div>}
        {state === 'done' && <><div style={{ fontSize: 36, marginBottom: 8 }}>✓</div><h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>You're unsubscribed</h1><p style={{ fontSize: 14, color: '#64748B' }}>You won't receive further emails from this sender. You can ignore future automated messages.</p></>}
        {state === 'error' && <><h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Link invalid</h1><p style={{ fontSize: 14, color: '#64748B' }}>This unsubscribe link is invalid or has expired.</p></>}
      </div>
    </div>
  )
}
