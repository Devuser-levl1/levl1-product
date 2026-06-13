'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface Me {
  user: { id: string; name: string; email: string; role: string }
  tenant: { id: string; name: string; plan: string; trialEndsAt: string | null; trialActive: boolean }
}

const NAV = [
  { label: 'Dashboard', href: '/hire/dashboard' },
  { label: 'Jobs', href: '/hire/jobs' },
  { label: 'Candidates', href: '/hire/candidates' },
  { label: 'Pipeline', href: '/hire/pipeline' },
  { label: 'Interviews', href: '/hire/interviews' },
  { label: 'CRM', href: '/hire/crm' },
  { label: 'Analytics', href: '/hire/analytics' },
  { label: 'Analytics', href: '/hire/analytics' },
  { label: 'Settings', href: '/hire/settings' },
]

export default function HireLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)

  // Auth guard — redirect to login when there is no valid Hire JWT.
  useEffect(() => {
    fetch('/api/hire/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) {
          router.replace('/hire/login')
          return
        }
        setMe(d)
        setReady(true)
      })
      .catch(() => router.replace('/hire/login'))
  }, [router])

  async function logout() {
    await fetch('/api/hire/auth/logout', { method: 'POST' }).catch(() => {})
    router.replace('/hire/login')
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#0F172A', color: 'white', padding: '24px 16px', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#818CF8', marginBottom: 32 }}>Levl1 Hire</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  color: active ? '#fff' : '#94A3B8',
                  background: active ? '#1E293B' : 'transparent',
                  textDecoration: 'none', padding: '8px 12px', borderRadius: 6, fontSize: 14,
                }}
              >
                {item.label}
              </a>
            )
          })}
        </nav>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
        {/* Header with trial banner + user */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: '1px solid #E2E8F0', background: '#fff' }}>
          <TrialBanner tenant={me!.tenant} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#475569' }}>{me!.user.name}</span>
            <button onClick={logout} style={{ fontSize: 13, color: '#64748B', background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
              Log out
            </button>
          </div>
        </header>
        <main style={{ flex: 1, padding: 32 }}>{children}</main>
      </div>
    </div>
  )
}

interface BillingStatus { trialActive: boolean; trialDaysLeft: number | null; subscriptionStatus: string | null; usage: { interviews: number }; limits: { aiInterviewsPerMonth: number } }
function TrialBanner({ tenant }: { tenant: Me['tenant'] }) {
  const [bs, setBs] = useState<BillingStatus | null>(null)
  useEffect(() => { fetch('/api/hire/billing/status').then((r) => (r.ok ? r.json() : null)).then(setBs).catch(() => {}) }, [])

  if (!bs) {
    if (!tenant.trialActive) return <div />
  } else if (!bs.trialActive) {
    // On a paid plan — show a soft past_due note if needed, else nothing.
    if (bs.subscriptionStatus === 'past_due') {
      return <div style={{ fontSize: 13, fontWeight: 600, color: '#D97706', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 100, padding: '6px 14px' }}>Payment past due · <a href="/hire/settings/billing" style={{ color: '#D97706', textDecoration: 'underline' }}>Update billing</a></div>
    }
    return <div />
  }

  const days = bs?.trialDaysLeft ?? (tenant.trialEndsAt ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400000)) : 0)
  const atLimit = bs ? bs.usage.interviews >= bs.limits.aiInterviewsPerMonth : false
  const color = atLimit || days <= 2 ? '#DC2626' : days <= 5 ? '#D97706' : '#059669'
  const bg = atLimit || days <= 2 ? 'rgba(220,38,38,0.08)' : days <= 5 ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color, background: bg, border: `1px solid ${color}33`, borderRadius: 100, padding: '6px 14px' }}>
      <span>Trial: {days} day{days !== 1 ? 's' : ''} left{bs ? ` · ${bs.usage.interviews} of ${bs.limits.aiInterviewsPerMonth} AI interviews used` : ''}</span>
      <a href="/hire/settings/billing" style={{ color, textDecoration: 'underline' }}>Upgrade now</a>
    </div>
  )
}
