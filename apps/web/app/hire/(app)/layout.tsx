'use client'

export default function HireLayout({ children }: { children: React.ReactNode }) {
  // Basic shell — full sidebar/header components added in Sprint 1
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Placeholder sidebar */}
      <aside
        style={{
          width: 220,
          background: '#0F172A',
          color: 'white',
          padding: '24px 16px',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: '#818CF8', marginBottom: 32 }}>
          Levl1 Hire
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Dashboard', href: '/hire/dashboard' },
            { label: 'Jobs', href: '/hire/jobs' },
            { label: 'Candidates', href: '/hire/candidates' },
            { label: 'Pipeline', href: '/hire/pipeline' },
            { label: 'CRM', href: '/hire/crm' },
            { label: 'Analytics', href: '/hire/analytics' },
            { label: 'Settings', href: '/hire/settings' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                color: '#94A3B8',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 32, background: '#F8FAFC' }}>{children}</main>
    </div>
  )
}
