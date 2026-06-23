'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { H } from '@/components/ui/hire-tokens'
import { Card } from '@/components/ui/hire-kit'

// Renders the Audit Log settings card only for tenant admins.
export function AuditSettingsCard() {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => setIsAdmin(d?.user?.role === 'ADMIN')).catch(() => {})
  }, [])
  if (!isAdmin) return null
  return (
    <Link href="/hire/settings/audit" style={{ textDecoration: 'none' }}>
      <Card style={{ transition: 'border-color .15s ease' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: H.primary, marginBottom: 4 }}>Audit Log <span style={{ fontSize: 10, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.08)', borderRadius: 100, padding: '2px 7px', verticalAlign: 'middle' }}>ADMIN</span></div>
        <div style={{ fontSize: 13, color: H.faint }}>Who did what, when and why — across candidates, jobs, deals, rubric and team.</div>
      </Card>
    </Link>
  )
}
