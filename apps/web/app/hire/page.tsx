import Link from 'next/link'

export default function HireLanding() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 700, color: '#818CF8', marginBottom: 8 }}>
        Levl1 Hire
      </div>
      <div style={{ color: '#94A3B8', marginBottom: 40, fontSize: 16 }}>
        ATS + CRM for Indian staffing agencies
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link
          href="/hire/signup"
          style={{ background: '#4F46E5', color: 'white', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
        >
          Start Free Trial
        </Link>
        <Link
          href="/hire/login"
          style={{ background: '#1E293B', color: 'white', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
        >
          Sign In
        </Link>
      </div>
    </div>
  )
}
