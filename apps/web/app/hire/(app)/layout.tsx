'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AskLevl1Drawer } from '@/components/hire/ask-levl1-drawer'
import {
  LayoutDashboard, Briefcase, Users, KanbanSquare, Search, Database,
  CalendarDays, Building2, BarChart3, Megaphone, Mail, Network, Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react'

interface Me {
  user: { id: string; name: string; email: string; role: string }
  tenant: { id: string; name: string; plan: string; trialEndsAt: string | null; trialActive: boolean }
}

const NAV: { label: string; href: string; icon: LucideIcon; managerOnly?: boolean }[] = [
  { label: 'Dashboard', href: '/hire/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', href: '/hire/jobs', icon: Briefcase },
  { label: 'Candidates', href: '/hire/candidates', icon: Users },
  { label: 'Inbox', href: '/hire/inbox', icon: Mail },
  { label: 'Talent Pool', href: '/hire/talent-pool', icon: Database },
  { label: 'Pipeline', href: '/hire/pipeline', icon: KanbanSquare },
  { label: 'Sourcing', href: '/hire/sourcing', icon: Search },
  { label: 'Interviews', href: '/hire/interviews', icon: CalendarDays },
  { label: 'Team', href: '/hire/team', icon: Network, managerOnly: true },
  { label: 'CRM', href: '/hire/crm', icon: Building2 },
  { label: 'Analytics', href: '/hire/analytics', icon: BarChart3 },
  { label: 'Campaigns', href: '/hire/campaigns', icon: Megaphone },
  { label: 'Settings', href: '/hire/settings', icon: SettingsIcon },
]

export default function HireLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)
  // Levl1 SSO entitlements (Phase 4) — gates the Interviews launcher.
  const [entInterviews, setEntInterviews] = useState<boolean | null>(null)
  // Platform-staff link — only shown to allowlisted Levl1 staff.
  const [isStaff, setIsStaff] = useState(false)

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

  // Read cross-product entitlements to decide launcher vs upsell.
  useEffect(() => {
    fetch('/api/levl/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEntInterviews(!!d?.entitlements?.interviews))
      .catch(() => setEntInterviews(false))
  }, [])

  // Staff-only platform console link.
  useEffect(() => {
    fetch('/api/platform/me').then((r) => setIsStaff(r.ok)).catch(() => setIsStaff(false))
  }, [])

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
      <aside style={{ width: 224, background: '#0F172A', color: 'white', padding: '22px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28, padding: '0 6px' }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #6D28D9, #7C3AED)', transform: 'rotate(45deg)', flexShrink: 0 }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Levl1 <span style={{ color: '#A78BFA' }}>Hire</span></span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.filter((item) => !item.managerOnly || me!.user.role === 'ADMIN' || me!.user.role === 'MANAGER').map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  color: active ? '#fff' : '#94A3B8',
                  background: active ? 'rgba(124,58,237,0.22)' : 'transparent',
                  boxShadow: active ? 'inset 2px 0 0 #A78BFA' : 'none',
                  fontWeight: active ? 700 : 500,
                  textDecoration: 'none', padding: '9px 12px', borderRadius: 8, fontSize: 13.5, transition: 'background .15s ease',
                }}
              >
                <Icon size={17} strokeWidth={active ? 2.4 : 2} style={{ flexShrink: 0, color: active ? '#C4B5FD' : '#94A3B8' }} />
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
            {entInterviews === true && (
              <a href="/dashboard" target="_blank" rel="noopener" title="Open Levl1 Interviews — you're already signed in"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.22)', borderRadius: 8, padding: '6px 12px', textDecoration: 'none' }}>
                <span style={{ color: '#7C3AED' }}>◆</span> Levl1 Screen <span style={{ fontSize: 11 }}>↗</span>
              </a>
            )}
            {entInterviews === false && (
              <a href="/contact" title="Add Levl1 Interviews to your account"
                style={{ fontSize: 12.5, fontWeight: 600, color: '#64748B', textDecoration: 'none', border: '1px dashed #CBD5E1', borderRadius: 8, padding: '6px 12px' }}>
                + Add Levl1 Screen
              </a>
            )}
            {isStaff && (
              <a href="/platform/usage" title="Levl1 platform owner console" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', borderRadius: 8, padding: '6px 12px', textDecoration: 'none' }}>
                ◆ Platform <span style={{ fontSize: 11 }}>↗</span>
              </a>
            )}
            <span style={{ fontSize: 13, color: '#475569' }}>{me!.user.name}</span>
            <button onClick={logout} style={{ fontSize: 13, color: '#64748B', background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
              Log out
            </button>
          </div>
        </header>
        <main style={{ flex: 1, padding: 32 }}>{children}</main>
      </div>

      {/* Persistent, app-wide agentic assistant — slides in as a right overlay,
          stays open across navigation, never reflows the page. */}
      <AskLevl1Drawer />
    </div>
  )
}

// Hire billing status. Interviews are a SEPARATE product now — the Hire trial
// banner must NOT reference AI-interview counts. We surface the 14-day Hire
// trial (days left from trialEndsAt) and, optionally, monthly candidate usage.
interface BillingStatus {
  trialActive: boolean
  trialDaysLeft: number | null
  subscriptionStatus: string | null
  usage: { candidates: number }
  limits: { candidatesPerMonth: number }
}
function TrialBanner({ tenant }: { tenant: Me['tenant'] }) {
  const [bs, setBs] = useState<BillingStatus | null>(null)
  useEffect(() => {
    fetch('/api/hire/billing/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        console.log('[hire/trial-banner] billing status:', d)
        setBs(d)
      })
      .catch((e) => console.error('[hire/trial-banner] billing status failed:', e))
  }, [])

  if (!bs) {
    // Before the status loads, fall back to the tenant flag from /auth/me.
    if (!tenant.trialActive) return <div />
  } else if (!bs.trialActive) {
    // On a paid plan — show a soft past_due note if needed, else nothing.
    if (bs.subscriptionStatus === 'past_due') {
      return <div style={{ fontSize: 13, fontWeight: 600, color: '#D97706', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 100, padding: '6px 14px' }}>Payment past due · <a href="/hire/settings/billing" style={{ color: '#D97706', textDecoration: 'underline' }}>Update billing</a></div>
    }
    return <div />
  }

  const days = bs?.trialDaysLeft ?? (tenant.trialEndsAt ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400000)) : 0)
  // Green > 5 days, amber ≤ 5 days, red ≤ 2 days.
  const color = days <= 2 ? '#DC2626' : days <= 5 ? '#D97706' : '#059669'
  const bg = days <= 2 ? 'rgba(220,38,38,0.08)' : days <= 5 ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color, background: bg, border: `1px solid ${color}33`, borderRadius: 100, padding: '6px 14px' }}>
      <span>Trial: {days} day{days !== 1 ? 's' : ''} left{bs ? ` · ${bs.usage.candidates} of ${bs.limits.candidatesPerMonth} candidates this month` : ''}</span>
      <a href="/hire/settings/billing" style={{ color, textDecoration: 'underline' }}>Upgrade now</a>
    </div>
  )
}
