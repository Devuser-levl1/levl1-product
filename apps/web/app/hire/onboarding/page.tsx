'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/hire/auth-shell'

export default function HireOnboarding() {
  const router = useRouter()
  const [tenantName, setTenantName] = useState('')

  useEffect(() => {
    fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) { router.push('/hire/login'); return }
      setTenantName(d.tenant?.name ?? '')
    }).catch(() => {})
  }, [router])

  return <AuthShell title="Welcome to Levl1 Hire">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ color: '#E2E8F0', fontSize: 15, fontWeight: 700 }}>{tenantName ? `${tenantName} is all set 🎉` : 'Your workspace is ready 🎉'}</div>
      <div style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>
        Your 14-day free trial has started. Next steps:
        <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
          <li>Create your first job</li>
          <li>Add candidates and move them through your pipeline</li>
          <li>Invite your team from Settings</li>
        </ul>
      </div>
      <button onClick={() => router.push('/hire/dashboard')} style={{ padding: '12px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Go to dashboard →</button>
    </div>
  </AuthShell>
}
