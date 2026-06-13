'use client'
import { useState } from 'react'
import Link from 'next/link'

const PRODUCTS = [
  { href: '/hire', name: 'Levl1 Hire', desc: 'AI-powered ATS + CRM' },
  { href: '/interviews', name: 'Levl1 Interviews', desc: 'Autonomous AI voice L1' },
  { href: '/upword', name: 'Upword', desc: 'AI soft-skills coach · Soon' },
]

export function MarketingNav() {
  const [openProducts, setOpenProducts] = useState(false)
  const [mobile, setMobile] = useState(false)

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E2E8F0' }}>
      <div className="mkt-container" style={{ display: 'flex', alignItems: 'center', gap: 20, height: 60 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'inline-block' }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: '#0F172A' }}>Levl1</span>
        </Link>

        {/* Desktop links */}
        <nav className="mkt-desktop" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <div style={{ position: 'relative' }} onMouseEnter={() => setOpenProducts(true)} onMouseLeave={() => setOpenProducts(false)}>
            <button style={navLink}>Products ▾</button>
            {openProducts && (
              <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 12px 30px rgba(15,23,42,0.10)', padding: 8, width: 280 }}>
                {PRODUCTS.map((p) => (
                  <Link key={p.href} href={p.href} style={{ display: 'block', padding: '10px 12px', borderRadius: 8, textDecoration: 'none' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{p.desc}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/roadmap" style={navLink}>Roadmap</Link>
          <Link href="/pricing" style={navLink}>Pricing</Link>
        </nav>

        <div style={{ marginLeft: 'auto' }} className="mkt-desktop">
          <Link href="/login" style={{ ...navLink, marginRight: 6 }}>Sign in</Link>
          <Link href="/hire/signup" style={ctaBtn}>Start free</Link>
        </div>

        {/* Mobile hamburger */}
        <button className="mkt-mobile" onClick={() => setMobile(!mobile)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#0F172A' }} aria-label="Menu">☰</button>
      </div>

      {/* Mobile menu */}
      {mobile && (
        <div className="mkt-mobile" style={{ borderTop: '1px solid #E2E8F0', background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {PRODUCTS.map((p) => <Link key={p.href} href={p.href} onClick={() => setMobile(false)} style={mobileLink}>{p.name}</Link>)}
          <Link href="/roadmap" onClick={() => setMobile(false)} style={mobileLink}>Roadmap</Link>
          <Link href="/pricing" onClick={() => setMobile(false)} style={mobileLink}>Pricing</Link>
          <Link href="/login" onClick={() => setMobile(false)} style={mobileLink}>Sign in</Link>
          <Link href="/hire/signup" onClick={() => setMobile(false)} style={{ ...ctaBtn, textAlign: 'center', marginTop: 6 }}>Start free</Link>
        </div>
      )}
    </header>
  )
}

const navLink: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#334155', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: 8 }
const mobileLink: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#334155', textDecoration: 'none', padding: '10px 8px' }
const ctaBtn: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#fff', background: '#4F46E5', borderRadius: 8, padding: '9px 16px', textDecoration: 'none', display: 'inline-block' }
