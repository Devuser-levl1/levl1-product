'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BarChart3, Users2 } from 'lucide-react'

const NAV = [
  { label: 'Usage Ledger', href: '/platform/usage', icon: BarChart3 },
  { label: 'Clients (CRM)', href: '/platform/clients', icon: Users2 },
]

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading')
  const [me, setMe] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    fetch('/api/platform/me').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.email) { setMe(d); setState('ok') } else setState('denied')
    }).catch(() => setState('denied'))
  }, [])

  if (state === 'loading') return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1020', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Loading…</div>
  if (state === 'denied') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1020', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center', color: '#E2E8F0' }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Platform staff only</div>
        <div style={{ fontSize: 13.5, color: '#94A3B8', marginTop: 8, lineHeight: 1.6 }}>This console is restricted to Levl1 staff. Sign in with a staff account, or ask an admin to add your email to the platform allowlist.</div>
        <a href="/hire/login" style={{ display: 'inline-block', marginTop: 18, padding: '10px 18px', borderRadius: 9, background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Sign in →</a>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <aside style={{ width: 230, background: '#0B1020', color: '#fff', padding: '22px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6, padding: '0 6px' }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #6D28D9, #7C3AED)', transform: 'rotate(45deg)', flexShrink: 0 }} />
          <span style={{ fontSize: 17, fontWeight: 800 }}>Levl1 <span style={{ color: '#A78BFA' }}>Platform</span></span>
        </div>
        <div style={{ fontSize: 10.5, color: '#64748B', padding: '0 6px', marginBottom: 22, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Owner console</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href === '/platform/usage' && pathname === '/platform')
            const Icon = item.icon
            return (
              <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, color: active ? '#fff' : '#94A3B8', background: active ? 'rgba(124,58,237,0.25)' : 'transparent', boxShadow: active ? 'inset 2px 0 0 #A78BFA' : 'none', fontWeight: active ? 700 : 500, textDecoration: 'none', padding: '9px 12px', borderRadius: 8, fontSize: 13.5 }}>
                <Icon size={17} strokeWidth={active ? 2.4 : 2} style={{ color: active ? '#C4B5FD' : '#94A3B8' }} /> {item.label}
              </a>
            )
          })}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 12.5, color: '#E2E8F0', fontWeight: 600 }}>{me?.name}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>{me?.email}</div>
          <a href="/hire/dashboard" style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: '#A78BFA', textDecoration: 'none' }}>← Back to Hire app</a>
        </div>
      </aside>
      <div style={{ flex: 1, background: '#F8FAFC', minWidth: 0 }}>
        <main style={{ padding: 32 }}>{children}</main>
      </div>
    </div>
  )
}
