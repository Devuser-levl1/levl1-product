'use client'
import { useEffect, useState } from 'react'
import { H } from '@/components/ui/hire-tokens'
import { Card } from '@/components/ui/hire-kit'

type BusinessType = 'AGENCY' | 'ENTERPRISE'

const COPY: Record<BusinessType, string> = {
  AGENCY: 'Staffing firm — full suite incl. CRM, Receivables & candidate nurturing (Campaigns).',
  ENTERPRISE: 'In-house HR — hiring for your own company. No CRM, Receivables or nurturing.',
}

// Admin-only card to view/change the tenant's business type. AGENCY sees every
// surface; ENTERPRISE hides CRM / Receivables / Campaigns (nav + APIs).
export function BusinessTypeCard() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [value, setValue] = useState<BusinessType | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.user?.role === 'ADMIN') setIsAdmin(true)
      if (d?.tenant?.businessType) setValue(d.tenant.businessType)
    }).catch(() => {})
  }, [])

  if (!isAdmin || !value) return null

  async function save(next: BusinessType) {
    if (next === value) return
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/hire/settings/tenant', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType: next }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg(d.error ?? 'Could not save.'); return }
      setValue(d.tenant.businessType)
      setMsg('Saved — reloading…')
      // Nav + gating are resolved at load; reload so the sidebar reflects it.
      setTimeout(() => window.location.reload(), 700)
    } catch { setMsg('Something went wrong.') } finally { setSaving(false) }
  }

  return (
    <Card>
      <div style={{ fontSize: 15, fontWeight: 800, color: H.primary, marginBottom: 4 }}>
        Business type <span style={{ fontSize: 10, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.08)', borderRadius: 100, padding: '2px 7px', verticalAlign: 'middle' }}>ADMIN</span>
      </div>
      <div style={{ fontSize: 13, color: H.faint, marginBottom: 12 }}>{COPY[value]}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['AGENCY', 'ENTERPRISE'] as BusinessType[]).map((t) => {
          const active = value === t
          return (
            <button key={t} onClick={() => save(t)} disabled={saving}
              style={{ flex: 1, padding: '9px 10px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                border: '1px solid ' + (active ? '#6D28D9' : '#E2E8F0'), background: active ? 'rgba(109,40,217,0.08)' : '#fff', color: active ? '#6D28D9' : '#64748B' }}>
              {t === 'AGENCY' ? 'Agency' : 'Enterprise'}{active ? ' ✓' : ''}
            </button>
          )
        })}
      </div>
      {msg && <div style={{ fontSize: 12.5, color: msg.startsWith('Saved') ? '#059669' : '#DC2626', marginTop: 8 }}>{msg}</div>}
    </Card>
  )
}
