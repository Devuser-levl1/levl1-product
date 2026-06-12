'use client'

export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', fontFamily: 'Inter, sans-serif', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#818CF8', marginBottom: 4 }}>Levl1 Hire</div>
        <div style={{ color: '#94A3B8', fontSize: 14, marginBottom: 24 }}>{title}</div>
        <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: 24 }}>{children}</div>
        {footer && <div style={{ color: '#64748B', fontSize: 13, marginTop: 16, textAlign: 'center' }}>{footer}</div>}
      </div>
    </div>
  )
}
